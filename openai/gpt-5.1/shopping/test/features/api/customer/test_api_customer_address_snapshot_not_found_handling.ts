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
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Verify that requesting a non-existent customer address snapshot for a
 * legitimate customer results in a safe error without leaking cross-customer
 * data.
 *
 * Business context:
 *
 * - Address snapshots are immutable historical copies of customer addresses used
 *   for orders/shipments.
 * - The endpoint GET
 *   /shoppingMall/customer/customers/{customerId}/addressSnapshots/{addressSnapshotId}
 *   must enforce ownership based on customerId and must not reveal whether a
 *   snapshot exists for another customer.
 *
 * Test flow (adapted to available APIs and constraints):
 *
 * 1. Register an admin account (join) to configure geography master data.
 * 2. As the admin, create a country and region master record.
 * 3. Register a customer account (join) to act as the owner of addresses.
 * 4. As the customer, create a valid shipping address that references the
 *    configured country and region, so the customer legitimately has
 *    addresses.
 * 5. Generate a random UUID that is not associated with any customer-address
 *    snapshot in this test.
 * 6. Call GET
 *    /shoppingMall/customer/customers/{customerId}/addressSnapshots/{addressSnapshotId}
 *    with the customer context using the non-existent snapshot id.
 * 7. Use TestValidator.error to assert that the call fails (throws), without
 *    asserting any particular HTTP status code or error payload, satisfying the
 *    not-found semantics in a type-safe way.
 */
export async function test_api_customer_address_snapshot_not_found_handling(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to configure geography master data
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country master as admin
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(3),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: RandomGenerator.alphaNumeric(3),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Create a region under the created country
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(4),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
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

  // 4. Customer registration (join)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">) | null
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. As the customer, create a valid shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  // 6. Prepare a non-existent snapshot id (random UUID)
  const unknownSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Expect an error when requesting a non-existent snapshot for this customer
  await TestValidator.error(
    "requesting a non-existent address snapshot should fail",
    async () => {
      await api.functional.shoppingMall.customer.customers.addressSnapshots.at(
        connection,
        {
          customerId: customerAuthorized.id,
          addressSnapshotId: unknownSnapshotId,
        },
      );
    },
  );
}
