import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate customer address detail behavior after soft deletion.
 *
 * This scenario ensures that a customer-owned shipping address can be created,
 * retrieved, soft-deleted, and then queried again via the detail endpoint
 * `/shoppingMall/customer/customers/{customerId}/addresses/{addressId}`.
 *
 * Business goals:
 *
 * 1. Confirm that a freshly created address is returned as active (deleted_at is
 *    null) when fetched by its detail endpoint.
 * 2. After performing a DELETE on that address (which is modeled as a soft delete
 *    at the persistence layer), verify that the detail endpoint behaves
 *    according to one of the contract-allowed patterns:
 *
 *    - Either it still returns the address with deleted_at populated, making the
 *         logical deletion visible at the DTO level, OR
 *    - It no longer returns the record and instead fails with an HTTP error (e.g.
 *         4xx not found), keeping soft-deleted data hidden.
 * 3. Ensure that the soft-deleted state is distinguishable from the pre-deletion
 *    state and that no type or ownership invariants are violated.
 *
 * High-level steps:
 *
 * 1. Join a customer and obtain an authenticated customer context.
 * 2. Join and login an admin, then create a country and a region under it.
 * 3. Switch back to customer auth and create an address bound to the created
 *    country and region.
 * 4. Fetch the address detail and validate its fields and that deleted_at is null.
 * 5. Soft delete the address.
 * 6. Attempt to fetch the address detail again and assert either:
 *
 *    - A successfully returned address with non-null deleted_at, or
 *    - An HttpError raised by the SDK, which is treated as valid not-found behavior
 *         without checking exact status codes.
 */
export async function test_api_customer_address_detail_after_soft_delete(
  connection: api.IConnection,
) {
  // 1. Join customer and get authorized context
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 2. Join admin and login to gain admin privileges
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedOnJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // explicit admin login (even though join already authenticated) to
  // reflect actor switching semantics and ensure stable admin context
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedOnLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 3. As admin, create a country
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 4. As admin, create a region under that country
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(5),
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 5. Switch authentication back to the customer actor
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/account",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAuthorizedOnLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedOnLogin);

  // 6. As that customer, create a shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const createdAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(createdAddress);

  // basic invariants after creation
  TestValidator.equals(
    "created address belongs to the expected customer",
    createdAddress.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.predicate(
    "created address deleted_at is null or undefined before soft delete",
    createdAddress.deleted_at === null ||
      createdAddress.deleted_at === undefined,
  );

  const addressId: string & tags.Format<"uuid"> = createdAddress.id;

  // 7. Retrieve the address detail before deletion
  const beforeDelete: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.at(
      connection,
      {
        customerId,
        addressId,
      },
    );
  typia.assert(beforeDelete);

  TestValidator.equals(
    "detail before delete returns the same address id",
    beforeDelete.id,
    createdAddress.id,
  );
  TestValidator.predicate(
    "detail before delete has deleted_at null or undefined",
    beforeDelete.deleted_at === null || beforeDelete.deleted_at === undefined,
  );

  // 8. Soft delete the address
  await api.functional.shoppingMall.customer.customers.addresses.erase(
    connection,
    {
      customerId,
      addressId,
    },
  );

  // 9. Try to retrieve the address detail again after soft delete.
  // Two contract-compatible behaviors are allowed:
  //   A) Returns address with deleted_at populated (preferred)
  //   B) Throws HttpError (e.g., not found). Treat either as valid.

  let afterDelete: IShoppingMallCustomerAddress | null = null;
  let threwError = false;

  try {
    afterDelete =
      await api.functional.shoppingMall.customer.customers.addresses.at(
        connection,
        {
          customerId,
          addressId,
        },
      );
  } catch (exp) {
    threwError = true;
  }

  if (threwError === false && afterDelete !== null) {
    // Behavior A: soft-deleted address is still returned but with deleted_at set.
    typia.assert(afterDelete);

    TestValidator.equals(
      "after delete: detail still returns the same address id",
      afterDelete.id,
      createdAddress.id,
    );

    TestValidator.predicate(
      "after delete: deleted_at is non-null when detail still returns address",
      afterDelete.deleted_at !== null && afterDelete.deleted_at !== undefined,
    );

    // ensure that business fields remained stable across soft delete
    TestValidator.equals(
      "recipient_name remains unchanged after soft delete",
      afterDelete.recipient_name,
      createdAddress.recipient_name,
    );
    TestValidator.equals(
      "line1 remains unchanged after soft delete",
      afterDelete.line1,
      createdAddress.line1,
    );
    TestValidator.equals(
      "city remains unchanged after soft delete",
      afterDelete.city,
      createdAddress.city,
    );
    TestValidator.equals(
      "postal_code remains unchanged after soft delete",
      afterDelete.postal_code,
      createdAddress.postal_code,
    );
  } else {
    // Behavior B: implementation hides soft-deleted address and treats it as not-found.
    // Validate that calling the detail endpoint indeed results in an error.
    await TestValidator.error(
      "after delete: detail endpoint should fail when implementation hides soft-deleted records",
      async () => {
        await api.functional.shoppingMall.customer.customers.addresses.at(
          connection,
          {
            customerId,
            addressId,
          },
        );
      },
    );
  }

  // 10. Final sanity: at least one of the above branches must have executed.
  TestValidator.predicate(
    "soft-deleted address is distinguishable from pre-deletion state either via deleted_at or error behavior",
    (threwError === true && afterDelete === null) ||
      (threwError === false &&
        afterDelete !== null &&
        afterDelete.deleted_at !== null &&
        afterDelete.deleted_at !== undefined),
  );
}
