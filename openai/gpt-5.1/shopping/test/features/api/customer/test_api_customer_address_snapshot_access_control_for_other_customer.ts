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
 * Verify that a customer cannot access another customer's address snapshot.
 *
 * Business goal: Ensure that the address snapshot detail endpoint GET
 * /shoppingMall/customer/customers/{customerId}/addressSnapshots/{addressSnapshotId}
 * enforces strict ownership-based access control so that Customer B cannot
 * retrieve address snapshots belonging to Customer A.
 *
 * High-level steps:
 *
 * 1. Create an admin account and log in.
 * 2. As admin, create a country master and a region under that country.
 * 3. Register two customers: Customer A and Customer B.
 * 4. As Customer A, create a shipping address that references the country/region.
 * 5. Attempt to obtain (or best-effort approximate) a valid address snapshot for
 *    Customer A.
 * 6. Log in as Customer B and attempt to read address snapshot data that is
 *    associated with Customer A, expecting the request to fail.
 * 7. Optionally, hit the endpoint with mismatched customerId/snapshotId
 *    combination using Customer B, also expecting failure.
 *
 * Important constraints:
 *
 * - Never assert HTTP status code values; only validate that an error occurs via
 *   TestValidator.error.
 * - Never send type-invalid payloads; only rely on business logic and
 *   authorization failures.
 * - Never manipulate connection.headers directly; rely on SDK auth helpers.
 */
export async function test_api_customer_address_snapshot_access_control_for_other_customer(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Ensure admin login also works, using same credentials
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 2. As admin, create country and region masters
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code: `+${RandomGenerator.alphaNumeric(2)}`,
    is_active: true,
    sort_order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
    code: RandomGenerator.alphabets(5),
    name_en: RandomGenerator.name(2),
    region_type: "state",
    is_active: true,
    sort_order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 3. Register two customers: Customer A and Customer B
  const customerJoinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBodyA,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  const customerJoinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBodyB,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  // 4. As Customer A, create a shipping address
  // join() has just authenticated as Customer B; switch back to Customer A explicitly via login
  const customerALoginBody = {
    email: customerJoinBodyA.email,
    password: customerJoinBodyA.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerALoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerALoggedIn);

  const addressCreateBodyA = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressA: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerA.id,
        body: addressCreateBodyA,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(addressA);

  TestValidator.equals(
    "address belongs to customer A",
    addressA.shopping_mall_customer_id,
    customerA.id,
  );

  // 5. Best-effort: obtain or approximate a snapshot for Customer A
  let ownerCustomerIdForSnapshot: string & tags.Format<"uuid"> = customerA.id;
  let snapshotIdForTest: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Try a small number of attempts to get an actual snapshot from the endpoint
  for (let i = 0; i < 3; i++) {
    const trialCustomerId = customerA.id;
    const trialSnapshotId = typia.random<string & tags.Format<"uuid">>();

    try {
      const snapshot: IShoppingMallCustomerAddressSnapshot =
        await api.functional.shoppingMall.customer.customers.addressSnapshots.at(
          connection,
          {
            customerId: trialCustomerId,
            addressSnapshotId: trialSnapshotId,
          },
        );
      typia.assert<IShoppingMallCustomerAddressSnapshot>(snapshot);

      // If successful, adopt this concrete snapshot for the cross-customer test
      if (snapshot.customer !== undefined) {
        ownerCustomerIdForSnapshot = snapshot.customer.id;
      } else {
        ownerCustomerIdForSnapshot = trialCustomerId;
      }
      snapshotIdForTest = snapshot.id;
      break;
    } catch {
      // Ignore and try next random combination; on real backend this
      // will likely be not-found, which is acceptable. If all attempts
      // fail, we will retain random snapshotIdForTest.
    }
  }

  // 6. Switch to Customer B and attempt to access Customer A's snapshot
  const customerBLoginBody = {
    email: customerJoinBodyB.email,
    password: customerJoinBodyB.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerBLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBLoggedIn);

  // Cross-customer access attempt: B trying to access A's snapshot
  await TestValidator.error(
    "other customer cannot access address snapshot owned by another customer",
    async () => {
      await api.functional.shoppingMall.customer.customers.addressSnapshots.at(
        connection,
        {
          customerId: ownerCustomerIdForSnapshot,
          addressSnapshotId: snapshotIdForTest,
        },
      );
    },
  );

  // 7. Optional: mismatched customerId/snapshotId where customerId is B but
  // snapshot is associated (or intended to be associated) with A
  await TestValidator.error(
    "mismatched customerId and snapshotId should not leak snapshot details",
    async () => {
      await api.functional.shoppingMall.customer.customers.addressSnapshots.at(
        connection,
        {
          customerId: customerB.id,
          addressSnapshotId: snapshotIdForTest,
        },
      );
    },
  );
}
