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
 * Admin retrieves detailed customer info for a customer with an existing
 * shipping address.
 *
 * Business flow:
 *
 * 1. Register an admin (join) to obtain an admin authentication context.
 * 2. As admin, create a country master record.
 * 3. As admin, create a region under that country.
 * 4. Register a customer (join) to obtain a customer authentication context.
 * 5. As the customer, create a shipping address referencing the created country
 *    and region.
 * 6. Switch back to admin by logging in.
 * 7. As admin, call the customer detail endpoint to retrieve the customer.
 *
 * Validations:
 *
 * - The retrieved customer id and email match the ones from the customer join.
 * - Status and email_verified fields are consistent between the auth payload and
 *   the admin detail view.
 * - Lifecycle timestamps are present and type-correct (via typia.assert).
 * - Authorization is enforced: an unauthenticated call to the admin customer
 *   detail endpoint raises an error.
 */
export async function test_api_admin_customer_detail_with_address(
  connection: api.IConnection,
) {
  // 1. Admin join (registration + implicit login)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Create a country as admin
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countrySortOrder = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const countryBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(1),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: countrySortOrder,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 3. Create a region under that country
  const regionSortOrder = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const regionBody = {
    code: RandomGenerator.alphaNumeric(4),
    name_en: RandomGenerator.name(1),
    region_type: "state",
    is_active: true,
    sort_order: regionSortOrder,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 4. Customer join (registration + implicit login)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 5. As the customer, create a shipping address referencing the created country and region
  const addressBody = {
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

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // Basic linkage checks on the created address
  TestValidator.equals(
    "address customer linkage matches customer auth id",
    address.shopping_mall_customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "address country linkage matches created country",
    address.shopping_mall_country_id,
    country.id,
  );
  if (
    address.shopping_mall_region_id !== null &&
    address.shopping_mall_region_id !== undefined
  ) {
    TestValidator.equals(
      "address region linkage matches created region",
      address.shopping_mall_region_id,
      region.id,
    );
  }

  // 6. Switch back to admin via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth);

  // 7. As admin, retrieve the customer detail
  const customerDetail: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId: customerAuth.id as string & tags.Format<"uuid">,
    });
  typia.assert(customerDetail);

  // Identity consistency
  TestValidator.equals(
    "admin view customer id matches auth payload id",
    customerDetail.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "admin view customer email matches auth payload email",
    customerDetail.email,
    customerAuth.email,
  );

  // Status and email_verified consistency
  TestValidator.equals(
    "admin view customer status matches auth payload status",
    customerDetail.status,
    customerAuth.status,
  );
  TestValidator.equals(
    "admin view customer email_verified matches auth payload email_verified",
    customerDetail.email_verified,
    customerAuth.email_verified,
  );

  // Lifecycle timestamps are asserted by typia; just ensure created_at/updated_at are present via simple predicates
  TestValidator.predicate(
    "customer detail has created_at",
    customerDetail.created_at !== null &&
      customerDetail.created_at !== undefined,
  );
  TestValidator.predicate(
    "customer detail has updated_at",
    customerDetail.updated_at !== null &&
      customerDetail.updated_at !== undefined,
  );

  // Authorization negative test: unauthenticated connection should not be able to call admin customer detail
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated admin customer detail access should fail",
    async () => {
      await api.functional.shoppingMall.admin.customers.at(unauthConnection, {
        customerId: customerAuth.id as string & tags.Format<"uuid">,
      });
    },
  );
}
