import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallCustomer } from "../../../../structures/IShoppingMallCustomer";
import { IShoppingMallCustomerPasswordReset } from "../../../../structures/IShoppingMallCustomerPasswordReset";

/**
 * Complete a customer password reset by consuming a valid reset token and storing a new password for the existing customer account.
 *
 * This operation works with the password reset support records stored in `shopping_mall_customer_password_resets`, which are described in the database schema as single-use password reset records for customer accounts. Each reset record belongs to exactly one customer account, contains a unique `token`, and tracks both `expired_at` and `consumed_at` timestamps so reset attempts can be validated, expired, and audited without directly mutating the customer actor record until the request is accepted. The related customer account is the canonical authenticated identity stored in `shopping_mall_customers`, where the platform keeps the customer's unique login `email`, hashed password credential in `password_hash`, account restriction information in `banned_at`, and lifecycle preservation state in `deleted_at`.
 *
 * This endpoint is intended for credential recovery, not for the authenticated password change flow. A successful request must keep the same customer account identity and must not create a new customer account. After completion, the customer continues to use the same preserved account, including its related shopping history such as orders, wishlist entries, cart items, reviews, and other customer-owned records. Because the customer may be unable to sign in before recovery, the operation is not gated by an active customer session; instead, security is enforced through possession of a valid, unexpired, unconsumed reset token.
 *
 * Before this operation can be called successfully, a password reset record must already exist for the customer account. The service must verify that the provided token matches a reset record, that the record has not expired according to `expired_at`, and that it has not already been used according to `consumed_at`. The service must also verify that the linked customer account remains eligible for recovery completion. If the account has been banned or has been deleted, the system must reject the request and must not update the customer's `password_hash`.
 *
 * When the reset succeeds, the platform updates the `password_hash` on `shopping_mall_customers`, marks the reset record as consumed by setting `consumed_at`, updates timestamps as needed, and returns the current customer account resource. Failed attempts must leave the stored password unchanged, must not create replacement accounts, and must preserve all historical business records linked to the customer identity.
 *
 * This operation is commonly paired with the earlier password-reset issuance flow that creates the token-bearing reset record. After the reset is completed successfully, the customer can proceed to the normal customer sign-in operation using the unchanged account identity and the newly established password.
 *
 * @param props.connection
 * @param props.body Password reset token and new password
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a password recovery completion service centered on `shopping_mall_customer_password_resets` and `shopping_mall_customers`.
 *
 * 1. Accept a JSON request body containing the reset token and the new password value.
 * 2. Query `shopping_mall_customer_password_resets` by its unique `token` and eagerly load the related `customer` relation.
 * 3. If no reset record exists, reject the request as invalid.
 * 4. Compare the current timestamp to `expired_at`. If the token is expired, reject the request and do not modify any row.
 * 5. If `consumed_at` is already non-null, reject the request as an already used token and do not modify any row.
 * 6. Inspect the related `shopping_mall_customers` row. If `deleted_at` is non-null, reject the request because credential recovery must not recreate or reactivate a deleted customer through this operation. If `banned_at` is non-null, reject the request because banned customers are preserved but prevented from authenticating.
 * 7. Validate the new password according to the platform password policy implemented elsewhere in the service layer. Do not store plaintext. Hash the new password and prepare it for persistence as `password_hash`.
 * 8. Execute the password update and token consumption in a single transaction: update `shopping_mall_customers.password_hash`, set `shopping_mall_customers.updated_at` to now, set `shopping_mall_customer_password_resets.consumed_at` to now, and set `shopping_mall_customer_password_resets.updated_at` to now.
 * 9. Return the updated customer account resource shaped as `IShoppingMallCustomer`.
 *
 * Error handling requirements:
 * - Invalid, expired, or already consumed tokens must fail without changing the customer password.
 * - Requests for banned or deleted customer accounts must fail without changing either table.
 * - The operation must be idempotent only in the sense that repeated use of the same token after successful completion is rejected as already consumed; it must not silently rotate the password again.
 * - Preserve all existing commerce history and related child records because password recovery changes credentials only, not account identity or business ownership.
 * @path /shoppingMall/customer/passwordResets
 * @accessor api.functional.shoppingMall.customer.passwordResets.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Password reset token and new password
     */
    body: IShoppingMallCustomerPasswordReset.IUpdate;
  };
  export type Body = IShoppingMallCustomerPasswordReset.IUpdate;
  export type Response = IShoppingMallCustomer;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/customer/passwordResets",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/passwordResets";
  export const random = (): IShoppingMallCustomer =>
    typia.random<IShoppingMallCustomer>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a single customer password reset record by its unique identifier.
 *
 * This operation returns the detailed state of one record from the customer password reset store represented by the `shopping_mall_customer_password_resets` table. That table is defined as a collection of single-use password reset records for customer accounts, used during customer credential recovery. The underlying record includes the reset record identifier, the owner customer account reference, the unique reset token, the expiration timestamp that determines when the token is no longer valid, the optional consumption timestamp that indicates whether the token has already been used, and the issuance and last-update timestamps retained for auditability.
 *
 * This endpoint is intended for privileged security review and operational traceability rather than ordinary customer self-service. The schema comments explicitly state that these records are retained so reset attempts can be validated, expired, and audited without modifying the customer actor record directly, and that they remain available for security review and account recovery traceability. Because the payload concerns credential-recovery artifacts and customer account linkage, access should be restricted to administrative actors with platform oversight responsibilities, specifically administrator and superAdministrator.
 *
 * The operation reads a single existing record and does not alter token validity, expiration, or consumption state. Consumers should use this endpoint when an administrative investigation, support workflow, or audit trail requires examination of one specific reset record. It does not replace the authentication recovery flow itself, and it must not be treated as a customer-facing password reset execution API.
 *
 * If the specified record does not exist, the system should reject the request as a missing resource. If the caller lacks administrative authority, the system should deny access without disclosing unnecessary security details. Successful responses should reflect the database-backed state of the record exactly as stored, including whether the token has been consumed and when it will expire.
 *
 * @param props.connection
 * @param props.passwordResetId Unique identifier of the target customer password reset record
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a read-only detail query against `shopping_mall_customer_password_resets` using the primary key `id`.
 *
 * Validate that `passwordResetId` is a UUID-formatted identifier. Authorize the caller before querying business data. This operation should be available only to privileged administrative actors responsible for platform oversight and security review. Regular customers and sellers must not be allowed to access password reset records through this endpoint.
 *
 * Load the target password reset record by `id`. Return the corresponding DTO mapped from the persisted columns: `id`, `shopping_mall_customer_id`, `token`, `expired_at`, `consumed_at`, `created_at`, and `updated_at`. The implementation may additionally resolve related customer context internally for authorization or audit logging, but the primary response source is the password reset record itself.
 *
 * If no matching record exists, raise a not-found error. Do not mutate the record during retrieval. In particular, do not mark the token as consumed, extend expiration, rotate the token, or update timestamps as a side effect of this operation. Log administrative access according to the service's security and audit practices because the underlying table is explicitly retained for security review and account recovery traceability.
 * @path /shoppingMall/customer/passwordResets/:passwordResetId
 * @accessor api.functional.shoppingMall.customer.passwordResets.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Unique identifier of the target customer password reset record
     */
    passwordResetId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallCustomerPasswordReset;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/passwordResets/:passwordResetId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/passwordResets/${encodeURIComponent(props.passwordResetId ?? "null")}`;
  export const random = (): IShoppingMallCustomerPasswordReset =>
    typia.random<IShoppingMallCustomerPasswordReset>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("passwordResetId")(() =>
        typia.assert(props.passwordResetId),
      );
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
