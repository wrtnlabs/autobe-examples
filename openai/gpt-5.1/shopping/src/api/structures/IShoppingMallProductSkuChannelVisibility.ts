export namespace IShoppingMallProductSkuChannelVisibility {
  /**
   * Per-channel visibility overrides for a product SKU in update operations.
   *
   * Represents boolean switches that allow the caller to explicitly enable or
   * disable visibility of a SKU on specific sales channels such as the
   * primary web storefront, mobile experiences, or external marketplaces.
   *
   * These flags are evaluated in combination with higher-level activation
   * fields like `isActive` and `isPurchasable` to compute final catalog
   * exposure for the SKU.
   */
  export type IUpdate = {
    /**
     * Whether this SKU is visible on the primary web storefront channel.
     *
     * When set to false, the SKU is hidden from web catalog listings and
     * product detail pages even if it is active and purchasable in
     * general.
     */
    web?: boolean | undefined;

    /**
     * Whether this SKU is visible on mobile applications or mobile-specific
     * storefronts.
     *
     * This flag can be used to run staged rollouts or channel-specific
     * merchandising strategies on mobile.
     */
    mobile?: boolean | undefined;

    /**
     * Whether this SKU is visible on external or third-party marketplace
     * integrations handled by the platform.
     *
     * Disabling this flag keeps the SKU internal to the core storefront
     * while preventing synchronization to connected marketplaces.
     */
    marketplace?: boolean | undefined;
  };
}
