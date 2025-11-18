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
 * Validate retrieval of a single customer address snapshot and its immutability
 * shape.
 *
 * Business context:
 *
 * - Customers maintain shipping addresses; immutable historical snapshots are
 *   stored in shopping_mall_customer_address_snapshots and exposed via GET
 *   /shoppingMall/customer/customers/{customerId}/addressSnapshots/{addressSnapshotId}.
 * - Admins manage geography master data (countries and regions) that are embedded
 *   as summaries into snapshots.
 *
 * Due to SDK constraints (no explicit snapshot-creation API is exposed), this
 * test focuses on:
 *
 * - Exercising the customer and admin auth flows.
 * - Creating a realistic country and region master.
 * - Creating a realistic live customer address that references those masters by
 *   UUID foreign keys.
 * - Calling the address snapshot GET endpoint with a customer-scoped context and
 *   validating that:
 *
 *   - The response conforms to IShoppingMallCustomerAddressSnapshot.
 *   - A second call with the same parameters yields a structurally identical
 *       snapshot (proxy for immutability in this environment).
 *
 * Implementation steps:
 *
 * 1. Register a customer via POST /auth/customer/join and obtain
 *    IShoppingMallCustomer.IAuthorized. This also sets the Authorization header
 *    for the connection.
 * 2. Store the customer.id for later use as the customerId path parameter.
 * 3. Register an admin via POST /auth/admin/join to obtain
 *    IShoppingMallAdmin.IAuthorized. This call automatically replaces the
 *    Authorization header with an admin token.
 * 4. As admin, create a country using POST /shoppingMall/admin/countries with an
 *    IShoppingMallCountry.ICreate body:
 *
 *    - Country_code: random short code (e.g., "US"-like string).
 *    - Name_en: random name.
 *    - Phone_code: random phone prefix or null.
 *    - Is_active: true.
 *    - Sort_order: small int32. Capture the returned IShoppingMallCountry (its id
 *         and country_code will be used in later steps).
 * 5. As admin, create a region under that country using POST
 *    /shoppingMall/admin/countries/{countryCode}/regions with an
 *    IShoppingMallRegion.ICreate body:
 *
 *    - Code: random string.
 *    - Name_en: random name.
 *    - Region_type: optional random string or null.
 *    - Is_active: true.
 *    - Sort_order: small int32. Capture the returned IShoppingMallRegion, which
 *         includes a country summary that should be consistent with the country
 *         created in step 4.
 * 6. Switch back to the customer actor using POST /auth/customer/login with the
 *    original customer email/password. This ensures the Authorization header is
 *    now a customer token for customer-owned operations.
 * 7. As the customer, create a live shipping address using POST
 *    /shoppingMall/customer/customers/{customerId}/addresses with an
 *    IShoppingMallCustomerAddress.ICreate body:
 *
 *    - Shopping_mall_country_id: country.id from step 4.
 *    - Shopping_mall_region_id: region.id from step 5.
 *    - Recipient_name, line1, line2, city, postal_code, phone_number: realistic
 *         random strings.
 *    - Is_default: true. Capture the returned IShoppingMallCustomerAddress and
 *         assert it.
 * 8. Prepare parameters for the snapshot retrieval call:
 *
 *    - CustomerId: use the authenticated customer.id (UUID).
 *    - AddressSnapshotId: for lack of a creation API, generate a random UUID using
 *         typia.random<string & tags.Format<"uuid">>(). In a real backend this
 *         would be obtained from order/shipping flows.
 * 9. Call GET
 *    /shoppingMall/customer/customers/{customerId}/addressSnapshots/{addressSnapshotId}
 *    via api.functional.shoppingMall.customer.customers.addressSnapshots.at
 *    with the props object typed as at.Props, and capture the returned
 *    IShoppingMallCustomerAddressSnapshot.
 *
 *    - Use typia.assert to validate the response shape and formats.
 * 10. Call the same endpoint again with the same parameters and capture the second
 *     snapshot.
 *
 *     - Assert its type with typia.assert.
 *     - Use TestValidator.equals with a descriptive title and the actual first
 *           snapshot as the first argument and the second snapshot as the
 *           expected value to ensure structural equality. This models
 *           immutability for a given id over repeated reads.
 * 11. Optionally, perform additional sanity checks on fields internal to the
 *     snapshot object (all validated structurally by typia.assert); for
 *     example, verifying that recipient_name and line1 are non-empty strings
 *     via TestValidator.predicate.
 */
export async function test_api_customer_address_snapshot_retrieval_basic_flow(
  connection: api.IConnection,
) {
  // 1. Customer join (self-registration) to obtain customer actor and token.
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

  // 2. Admin join to obtain admin actor and token for master data creation.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Create country master as admin.
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code: "+" + typia.random<number & tags.Type<"int32">>().toString(),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 4. Create region under that country as admin.
  const regionCreateBody = {
    code: RandomGenerator.alphabets(4).toUpperCase(),
    name_en: RandomGenerator.name(2),
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

  // 5. Switch back to customer actor with login.
  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 6. Create a live customer address referencing the created country/region.
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  // Sanity checks on created address fields.
  TestValidator.predicate(
    "recipient_name should be non-empty",
    address.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "line1 should be non-empty",
    address.line1.length > 0,
  );

  // 7. Prepare snapshot retrieval parameters.
  const addressSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 8. First retrieval of the snapshot.
  const snapshot1: IShoppingMallCustomerAddressSnapshot =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.at(
      connection,
      {
        customerId,
        addressSnapshotId,
      },
    );
  typia.assert(snapshot1);

  // Basic sanity checks on snapshot fields.
  TestValidator.predicate(
    "snapshot recipient_name should be non-empty",
    snapshot1.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot line1 should be non-empty",
    snapshot1.line1.length > 0,
  );

  // 9. Second retrieval of the same snapshot to model immutability.
  const snapshot2: IShoppingMallCustomerAddressSnapshot =
    await api.functional.shoppingMall.customer.customers.addressSnapshots.at(
      connection,
      {
        customerId,
        addressSnapshotId,
      },
    );
  typia.assert(snapshot2);

  // Assert structural equality between the two reads.
  TestValidator.equals(
    "address snapshot should be immutable across repeated reads",
    snapshot1,
    snapshot2,
  );
}
