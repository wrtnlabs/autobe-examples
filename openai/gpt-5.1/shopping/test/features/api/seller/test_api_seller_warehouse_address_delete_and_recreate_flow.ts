import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallSellerWarehouseAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouseAddress";

/**
 * Validate delete-and-recreate lifecycle of a seller warehouse address.
 *
 * Business goal: Ensure that when a seller deletes the address of a warehouse,
 * the one-to-one uniqueness on seller_warehouse_id is properly freed so a new
 * address can be created again for the same warehouse without conflict.
 *
 * Steps:
 *
 * 1. Register a seller and rely on auto-login token.
 * 2. Create a seller warehouse as that seller.
 * 3. Register an admin and rely on auto-login token.
 * 4. As admin, create a country and a region master.
 * 5. Switch back to seller via login.
 * 6. As seller, create an initial address for the warehouse.
 * 7. Delete the warehouse address.
 * 8. Recreate a new address for the same warehouse.
 * 9. Validate that the new address is associated with the same warehouse and that
 *    the payload reflects the second creation, confirming delete and recreate
 *    semantics.
 */
export async function test_api_seller_warehouse_address_delete_and_recreate_flow(
  connection: api.IConnection,
) {
  // 1. Seller joins (auto-login handled by SDK)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphabets(12) as string &
    tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinResult);

  // 2. Seller creates a warehouse
  const warehouseCreateBody = {
    code: `WH-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: warehouseCreateBody },
    );
  typia.assert(warehouse);

  // 3. Admin joins (auto-login)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12) as string &
    tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinResult);

  // 4. As admin, create country and region
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();

  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Test Country",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "R1",
    name_en: "Test Region",
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

  // 5. Switch back to seller via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  // 6. Create initial address for the warehouse
  const initialAddressBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Test City",
    postal_code: RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  const firstAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: initialAddressBody,
      },
    );
  typia.assert(firstAddress);

  TestValidator.equals(
    "initial address linked to correct warehouse",
    firstAddress.seller_warehouse_id,
    warehouse.id,
  );

  TestValidator.equals(
    "initial address uses created country",
    firstAddress.country.id,
    country.id,
  );

  TestValidator.equals(
    "initial address uses created region",
    firstAddress.region?.id ?? null,
    region.id,
  );

  // 7. Delete the warehouse address
  await api.functional.shoppingMall.seller.sellerWarehouses.address.erase(
    connection,
    { warehouseId: warehouse.id },
  );

  // 8. Recreate a new address for the same warehouse with different fields
  const recreateAddressBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Another City",
    postal_code: RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  const secondAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: recreateAddressBody,
      },
    );
  typia.assert(secondAddress);

  // 9. Business validations
  TestValidator.equals(
    "second address linked to same warehouse",
    secondAddress.seller_warehouse_id,
    warehouse.id,
  );

  TestValidator.notEquals(
    "second address recipient_name differs from first",
    secondAddress.recipient_name,
    firstAddress.recipient_name,
  );

  TestValidator.notEquals(
    "second address line1 differs from first",
    secondAddress.line1,
    firstAddress.line1,
  );

  TestValidator.equals(
    "second address payload recipient_name matches body",
    secondAddress.recipient_name,
    recreateAddressBody.recipient_name,
  );

  TestValidator.equals(
    "second address payload line1 matches body",
    secondAddress.line1,
    recreateAddressBody.line1,
  );

  TestValidator.equals(
    "second address payload line2 matches body",
    secondAddress.line2 ?? null,
    recreateAddressBody.line2 ?? null,
  );

  TestValidator.equals(
    "second address payload city matches body",
    secondAddress.city,
    recreateAddressBody.city,
  );

  TestValidator.equals(
    "second address payload postal_code matches body",
    secondAddress.postal_code,
    recreateAddressBody.postal_code,
  );

  TestValidator.equals(
    "second address payload phone matches body",
    secondAddress.phone ?? null,
    recreateAddressBody.phone ?? null,
  );
}
