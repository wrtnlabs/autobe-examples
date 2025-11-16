import { IShoppingMallCustomer } from "./IShoppingMallCustomer";
import { IShoppingMallSeller } from "./IShoppingMallSeller";
import { IShoppingMallPlatformAdmin } from "./IShoppingMallPlatformAdmin";

export namespace IShoppingMallAuthCredentialsActor {
  /**
   * Polymorphic summary view of the actor that owns a given authentication
   * credential.
   *
   * This helper DTO wraps the BELONGS-TO association from
   * `shopping_mall_auth_credentials` to the concrete actor tables (customer,
   * seller, platform administrator). It uses the universal `.ISummary`
   * pattern for each actor type and is designed to be embedded in
   * `IShoppingMallAuthCredentials.ISummary` so that admin and security tools
   * can see who a credential belongs to in a single list response.
   *
   * Only one of the actor-specific summary properties (customer, seller,
   * platformAdmin) will be non-null for a given instance, depending on the
   * `actorType` discriminator. This keeps the structure explicit while
   * remaining type-safe for code generation.
   */
  export type ISummary = {
    /**
     * Discriminator indicating which concrete actor type owns the
     * credential.
     *
     * This value aligns with the `actor_type` column on
     * `shopping_mall_auth_credentials` and determines which of the actor
     * summary properties (customer, seller, platformAdmin) is populated.
     *
     * Only the following literal values are valid here, and client and
     * server implementations MUST treat this field as an enum-like
     * discriminator:
     *
     * - `customer` → `customer` summary is populated
     * - `seller` → `seller` summary is populated
     * - `platformadmin` → `platformAdmin` summary is populated.
     *
     * Any other value must be rejected during validation or mapped to an
     * explicit error in API implementations.
     */
    actorType: string;

    /**
     * Summary of the customer account that owns the credential when
     * `actorType` is `customer`.
     *
     * This property is null or omitted for non-customer credentials. It
     * uses the customer `.ISummary` projection to avoid deep nesting while
     * providing enough information for admin and security UIs.
     */
    customer?: IShoppingMallCustomer.ISummary | undefined;

    /**
     * Summary of the seller account that owns the credential when
     * `actorType` is `seller`.
     *
     * This property is null or omitted for non-seller credentials. It uses
     * the seller `.ISummary` projection, giving lightweight context about
     * the merchant associated with the credential.
     */
    seller?: IShoppingMallSeller.ISummary | undefined;

    /**
     * Summary of the platform administrator account that owns the
     * credential when `actorType` is `platformadmin`.
     *
     * This property is null or omitted for credentials belonging to other
     * actor types. It uses the platform administrator `.ISummary`
     * projection so that security tooling can easily identify the owner of
     * highly privileged credentials.
     */
    platformAdmin?: IShoppingMallPlatformAdmin.ISummary | undefined;
  };
}
