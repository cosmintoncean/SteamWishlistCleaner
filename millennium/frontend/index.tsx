import { definePlugin, Field, IconsModule } from 'millennium';

function SettingsContent() {
	return (
		<Field
			label="How to use"
			description="Open your wishlist in the Store tab, then click Wishlist Cleaner at the bottom right."
		/>
	);
}

export default definePlugin(() => ({
	title: 'Steam Wishlist Cleaner',
	icon: <IconsModule.Settings />,
	content: <SettingsContent />,
}));
