import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { IShoppingMallCustomerProfile } from "../../../../structures/IShoppingMallCustomerProfile";

export * as snapshots from "./snapshots/index";

/**
 * Update the authenticated customer's own customer-facing profile information.
 *
 * This operation manages the single active profile record stored in `shopping_mall_customer_profiles`, which the schema describes as the customer-facing profile data associated with a registered customer account. It is intended for self-service profile maintenance by a signed-in customer and updates the profile attributes used in account presentation, specifically the display name and phone number. The operation does not create a separate profile identity; instead, it modifies the dependent one-to-one profile linked to the authenticated record in `shopping_mall_customers`.
 *
 * Access to this operation is restricted to an authenticated customer acting on their own account context. The requirements state that profile access without login must be denied and that profile operations are limited to the customer performing the edit. No customer identifier is exposed in the route because ownership is resolved from the current authenticated session. If there is no active customer account context, or if the related customer account has already been deleted, the operation must be rejected and no profile data may be recreated through this update.
 *
 * The underlying database structure separates mutable presentation data from account identity and authentication data. The `shopping_mall_customer_profiles` table contains `display_name` and `phone_number` as the editable customer-facing fields, while `shopping_mall_customers` contains account-level fields such as `email`, `password_hash`, `banned_at`, and `deleted_at`. In line with the requirements, this API only permits updates to the profile fields and must reject attempts to change unrelated account information through the profile editing flow. This separation ensures that current profile maintenance remains independent from preserved commerce history.
 *
 * This operation must preserve historical business records. The requirements explicitly state that profile editing and profile-related failures must not alter preserved orders, order history, or preserved reviews. If the customer has prior orders, changing the current profile updates only present account information and does not modify order-time historical records. If the customer later deletes the account, profile data is removed from active data while preserved orders remain intact and preserved reviews continue to appear with the author represented as deleted user.
 *
 * This endpoint is typically used after the authenticated customer has opened their account profile management view. A successful response returns the updated current profile state for immediate display in the client. Validation or authorization failures must leave the existing profile unchanged.
 *
 * @param props.connection
 * @param props.body Updated customer-owned profile fields
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Resolve the authenticated customer from the active
 *   customer session context and load the corresponding
 *   `shopping_mall_customers` record together with its one-to-one
 *   `shopping_mall_customer_profiles` relation.
 *
 * Before performing any write, verify that an authenticated customer context exists. If not, reject the request as unauthorized. Then verify that the customer account is still active by checking that `shopping_mall_customers.deleted_at` is null. If the customer account is deleted, reject the request and do not recreate profile data. If needed by service policy, also deny access when the authenticated customer is banned from active use.
 *
 * Validate the request body against the supported profile-edit scope. Accept only the editable profile fields represented by the profile resource, namely `display_name` and `phone_number` from `shopping_mall_customer_profiles`. Do not accept or persist account-level fields such as `email`, `password_hash`, `banned_at`, `created_at`, `updated_at`, or `deleted_at`, and reject unsupported changes from the profile editing area according to the business rule.
 *
 * Update the existing profile row identified by the authenticated customer's `id` through the unique constraint on `shopping_mall_customer_profiles.shopping_mall_customer_id`. Persist the new `display_name` and `phone_number`, and refresh `updated_at` to the current timestamp. If the profile row is unexpectedly missing despite the one-to-one model assumption, treat it as a domain consistency error unless the broader service architecture explicitly provisions the profile at account creation and guarantees its existence.
 *
 * Return the updated customer profile record as the response. The operation must not modify any order, order snapshot, review, or other preserved historical records. All failure paths must be non-destructive to existing profile and historical data.
 * @path /shoppingMall/seller/profile
 * @accessor api.functional.shoppingMall.seller.profile.update
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
     * Updated customer-owned profile fields
     */
    body: IShoppingMallCustomerProfile.IUpdate;
  };
  export type Body = IShoppingMallCustomerProfile.IUpdate;
  export type Response = IShoppingMallCustomerProfile;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/seller/profile",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/profile";
  export const random = (): IShoppingMallCustomerProfile =>
    typia.random<IShoppingMallCustomerProfile>();
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
