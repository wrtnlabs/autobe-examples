import { tags } from "typia";

export namespace IShoppingMallLocationZone {
  /**
   * Summary representation of a location zone for product variant
   * availability.
   *
   * Provides essential information about a geographic region where product
   * variants are available for sale, including regulatory, currency, and
   * operational context.
   *
   * Designed for use in administrative dashboards and customer-facing
   * inventory displays to show regional availability of product variants.
   *
   * Excludes detailed regulatory documentation and compliance audit trails,
   * which are available in separate endpoints.
   *
   * All fields represent reconciled information from multiple sources
   * including compliance databases, currency systems, and regional
   * configuration services.
   *
   * Used in product variant availability determination, where a variant is
   * only visible to customers in location zones that are active and
   * compliant.
   */
  export type ISummary = {
    /**
     * Unique identifier for the location zone.
     *
     * This UUID is the primary key used to uniquely identify each
     * geographic region where the product variant is available for sale.
     *
     * Generated as a UUID v4 to ensure global uniqueness across distributed
     * systems and prevent conflicts between different geographic regions.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name of the location zone.
     *
     * The human-readable name used in administrative interfaces and
     * customer-facing systems to represent the geographic region.
     *
     * Typically follows standard geographic terminology (e.g., "North
     * America", "Europe", "Asia-Pacific", "Global").
     *
     * Used for filtering, reporting, and determining regional availability
     * of product variants.
     *
     * Must be unique across the platform to avoid confusion and ensure
     * accurate regional targeting.
     */
    name: string;

    /**
     * Alphanumeric code representing the location zone.
     *
     * A standardized, short identifier used in system integrations, API
     * requests, and automated processes.
     *
     * Uses ISO 3166 region codes when applicable (e.g., "NA" for North
     * America, "EU" for Europe).
     *
     * For custom regions, uses a consistent 2-4 character uppercase code
     * (e.g., "APAC", "LATAM").
     *
     * Used as a key for system-level routing, compliance rules, and
     * currency/price mapping.
     */
    code: string;

    /**
     * Primary currency code for this location zone.
     *
     * ISO 4217 three-letter code representing the currency used for
     * transactions in this region.
     *
     * Common examples: USD, EUR, GBP, JPY, CAD, AUD, CHF, HKD.
     *
     * Used for pricing display, financial reconciliation, and tax
     * calculations.
     *
     * May differ from the store's default currency in multi-region setups
     * to ensure accurate financial reporting.
     */
    currency: string;

    /**
     * Current compliance status of the location zone.
     *
     * Compliant: All regulatory requirements for sale in this region are
     * met Non-compliant: One or more regulatory requirements are not
     * satisfied Pending: Compliance documentation is under review
     *
     * Determines whether product variants can be sold in this region.
     *
     * Critical for international trade regulations, tax laws, and product
     * safety standards.
     */
    compliance_status: "compliant" | "non_compliant" | "pending";

    /**
     * IANA time zone identifier for this location zone.
     *
     * Standard time zone identifier following IANA tz database format
     * (e.g., "America/New_York", "Europe/London", "Asia/Tokyo").
     *
     * Used for timestamp normalization, scheduling automated processes, and
     * customer-facing time displays.
     *
     * Ensures consistency in time-based operations across different
     * geographic regions.
     *
     * Avoids ambiguity from regional date-time representations, providing a
     * definitive reference for when events occur.
     */
    timezone: string;

    /**
     * Primary language code for this location zone.
     *
     * ISO 639-1 two-letter language code representing the primary language
     * used for customer-facing content in this region.
     *
     * Common examples: en, es, fr, de, ja, ko, zh, pt.
     *
     * Used for multilingual content delivery, email templates, and user
     * interface translation.
     *
     * May differ from the official national language for regions with
     * multiple official languages.
     */
    language: string;

    /**
     * Indicates whether this location zone is currently active for product
     * sales.
     *
     * True: Product variants can be sold in this region false: Product
     * variants are restricted from sale in this region
     *
     * Used for temporary geographic restrictions, market testing, or
     * regulatory suspensions.
     *
     * Does not delete the zone definition but prevents its use in
     * customer-facing interfaces and order processing.
     */
    is_active: boolean;
  };
}
