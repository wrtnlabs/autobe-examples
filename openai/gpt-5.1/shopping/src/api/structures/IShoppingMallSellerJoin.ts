import { tags } from "typia";

export namespace IShoppingMallSellerJoin {
  /**
   * Request body payload for registering a new seller account on the shopping
   * mall platform.
   *
   * This DTO collects login credential information and basic seller profile
   * data required to create both a credentials record in
   * shopping_mall_auth_credentials (with actor_type="seller") and a seller
   * profile record in shopping_mall_seller. The operation may also trigger
   * email verification workflows and audit logging, but these behaviors are
   * handled by the backend and are not exposed as fields in this request.
   */
  export type IRequest = {
    /**
     * Login email address for the seller account.
     *
     * This value is stored in shopping_mall_auth_credentials.email for
     * actor_type="seller" and typically also used as the primary contact
     * email in shopping_mall_seller. It must be unique for seller
     * credentials according to the (actor_type, email) uniqueness
     * constraint.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password to be used for the seller account.
     *
     * The backend hashes this value and stores only the derived
     * password_hash in shopping_mall_auth_credentials. The plaintext
     * password must never be persisted.
     */
    password: string;

    /**
     * Display name of the seller's store.
     *
     * This value is persisted in shopping_mall_seller.store_name and is
     * often subject to uniqueness constraints or business validation to
     * avoid duplicates and impersonation of existing brands.
     */
    storeName: string;

    /**
     * Primary contact phone number for the seller.
     *
     * Used for operational contact and support. The exact format is
     * validated according to platform policy, but typically follows
     * international phone number standards.
     */
    contactPhone?: string | undefined;
  };
}
