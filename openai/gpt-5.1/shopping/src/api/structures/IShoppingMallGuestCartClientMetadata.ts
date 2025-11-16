export namespace IShoppingMallGuestCartClientMetadata {
  /**
   * Client-side metadata structure for a guest cart update.
   *
   * This type represents optional contextual information about the anonymous
   * visitor's environment (for example, browser or device characteristics)
   * that can be attached to a guest cart for analytics, risk evaluation, or
   * UX optimization.
   *
   * `IShoppingMallGuestCartClientMetadata.IUpdate` is a pure value object: it
   * is **not** directly mapped to a dedicated Prisma model and is typically
   * stored either in a JSON column on `shopping_mall_guest_carts` or
   * decomposed into separate primitive fields. It is fully owned by the cart
   * aggregate and is not managed as an independent associated entity.
   */
  export type IUpdate = {
    /**
     * Raw `User-Agent` header string observed for the browser or client
     * making the request when the cart was last updated.
     *
     * This value helps with debugging, analytics, and device
     * classification, but does not participate in any relational mappings.
     */
    user_agent?: string | undefined;

    /**
     * High-level classification of the client device, such as `"desktop"`,
     * `"mobile"`, or `"tablet"`.
     *
     * This string is used only for analytics and UX optimization and is
     * stored as part of the cart’s compositional metadata rather than as a
     * separate entity relation.
     */
    device_type?: string | undefined;

    /**
     * BCP 47 language tag that indicates the preferred locale of the guest,
     * for example `"en-US"` or `"ko-KR"`.
     *
     * This locale can influence localized messaging, pricing presentation,
     * and other region- or language-sensitive behaviors, and is treated as
     * part of the cart aggregate’s metadata.
     */
    locale?: string | undefined;
  };
}
