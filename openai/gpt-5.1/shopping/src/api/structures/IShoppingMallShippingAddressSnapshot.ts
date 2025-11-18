export namespace IShoppingMallShippingAddressSnapshot {
  /**
   * Inline shipping address snapshot used when creating an order without
   * referencing a pre‑saved customer address.
   *
   * This DTO captures the address and contact details as they were at order
   * creation time so that subsequent changes to customer addresses do not
   * retroactively alter historical orders.
   *
   * Implementations typically persist this data into
   * `shopping_mall_shipping_addresses` or a related snapshot table tied to
   * the order or shipment.
   */
  export type ICreate = {
    /**
     * Full name of the recipient who will receive the shipment at this
     * address.
     *
     * Used on shipping labels and in carrier interactions.
     */
    recipient_name: string;

    /**
     * Primary phone number for the recipient.
     *
     * Carriers and support staff rely on this number for delivery
     * coordination or issue resolution; format validation may be applied
     * according to regional rules.
     */
    phone_number: string;

    /**
     * ISO country code for the destination country.
     *
     * Must be compatible with configured shipping regions and available
     * shipping methods.
     */
    country_code: string;

    /**
     * Postal or ZIP code for the destination address.
     *
     * Used by carriers and rate engines to determine routing and pricing.
     */
    postal_code: string;

    /**
     * State, province, or primary administrative region component of the
     * address.
     *
     * Helps with regional compliance and shipping calculations.
     */
    state_or_region: string;

    /**
     * City, town, or locality component of the address.
     *
     * Displayed on labels and used in carrier routing.
     */
    city: string;

    /**
     * First line of the street address.
     *
     * Typically contains building number and primary street information.
     */
    address_line1: string;

    /**
     * Second line of the street address for additional details.
     *
     * Often used for apartment numbers, building names, or other
     * supplemental information.
     */
    address_line2?: string | null | undefined;
  };
}
