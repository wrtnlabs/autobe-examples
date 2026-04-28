import { tags } from "typia";

export namespace IShoppingMallActor {
  /**
   * Request body for changing an authenticated actor's password. Requires the current password for security verification and a new password meeting the platform's complexity requirements. Used by customers, sellers, and administrators to update their own passwords via PUT /shoppingMall/seller/password (and equivalent endpoints for customers and administrators).
   */
  export type IPasswordUpdate = {
    /**
     * The actor's current password for security verification. Must match the password associated with the authenticated account before any password change can proceed.
     *
         * @x-autobe-specification Transient field for security verification.
         *   Retrieve password_hash from the appropriate actor table based on
         *   JWT token actor type (shopping_mall_customers.password_hash,
         *   shopping_mall_sellers.password_hash, or
         *   shopping_mall_administrators.password_hash). Verify using
         *   constant-time comparison with the same hashing algorithm used
         *   during registration. Return 400 error if verification fails. This
         *   field is never logged or stored in any form. Maximum length of 128
         *   characters prevents abuse from unreasonably long inputs.
     */
    current_password: string & tags.MinLength<1> & tags.Format<"password">;

    /**
     * The new password to set for the account. Must be 8-128 characters and contain at least one uppercase letter, one lowercase letter, one digit, and one special character from: !@#$%^&*()_+-=[]{}|;:'\",.<>?/~`. Cannot match your email address or contain your display name.
     *
         * @x-autobe-specification Transient field for password update. Validate
         *   against complexity requirements: 8-128 characters, at least one
         *   uppercase letter (A-Z), at least one lowercase letter (a-z), at
         *   least one digit (0-9), at least one special character from
         *   !@#$%^&*()_+-=[]{}|;:'\",.<>?/~`. Reject if matches actor's email
         *   address. Reject if contains actor's display_name (customers) or
         *   shop_name (sellers). Reject if identical to current_password. Check
         *   against compromised password patterns. After validation, hash using
         *   secure one-way algorithm and store as password_hash in the
         *   appropriate actor table. Update actor's updated_at timestamp. Never
         *   log or expose this value.
     */
    new_password: string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">;
  };

  /**
   * Summary representation of an authenticated actor in the shopping mall platform. This polymorphic type is returned by authentication-related operations (login, password change, token refresh) to identify the current user. The response varies based on the actor type: customers receive display_name, sellers receive shop_name, and administrators receive their grade.
   */
  export type ISummary =
    | {
        type: "customer";

        /**
         * Unique identifier of the customer
         */
        id: string & tags.Format<"uuid">;

        /**
         * Customer's email address used for authentication
         */
        email: string & tags.Format<"email">;

        /**
         * Customer's display name shown in reviews and public interactions
         */
        displayName: string | null;
      }
    | {
        type: "seller";

        /**
         * Unique identifier of the seller
         */
        id: string & tags.Format<"uuid">;

        /**
         * Seller's email address used for authentication
         */
        email: string & tags.Format<"email">;

        /**
         * Display name of the seller's shop visible to customers
         */
        shopName: string;
      }
    | {
        type: "administrator";

        /**
         * Unique identifier of the administrator
         */
        id: string & tags.Format<"uuid">;

        /**
         * Administrator's email address used for authentication
         */
        email: string & tags.Format<"email">;

        /**
         * Administrator privilege level: 'regular' for standard admin functions, 'super' for elevated privileges including promotion/demotion authority
         */
        grade: "regular" | "super";
      };
}
