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
 * Validate creation and persistence of a seller warehouse address when the
 * optional region_id is omitted.
 *
 * Business goal
 *
 * - Ensure that sellers can create an address for their warehouse that has a
 *   country but no region, and that the system stores and returns null for
 *   region_id / region in that case.
 *
 * Scenario steps
 *
 * 1. Register a seller (self-join) and obtain an authenticated seller context via
 *    /auth/seller/join.
 * 2. As that seller, create a warehouse via POST
 *    /shoppingMall/seller/sellerWarehouses using
 *    IShoppingMallSellerWarehouse.ICreate.
 * 3. Register an admin via /auth/admin/join and rely on the automatic token
 *    handling to get an authenticated admin context.
 * 4. As admin, create an active country via POST /shoppingMall/admin/countries
 *    using IShoppingMallCountry.ICreate and capture its id.
 * 5. Switch back to the seller context using /auth/seller/login with the original
 *    seller credentials.
 * 6. Call POST /shoppingMall/seller/sellerWarehouses/{warehouseId}/address via
 *    api.functional.shoppingMall.seller.sellerWarehouses .address.create with:
 *
 *    - WarehouseId = created warehouse.id
 *    - Body: IShoppingMallSellerWarehouseAddress.ICreate where
 *
 *         - Country_id = created country.id
 *         - Recipient_name, line1, city, postal_code are filled with realistic strings
 *         - Phone is optionally filled
 *         - Region_id IS NOT INCLUDED AT ALL in the body
 * 7. Assert the creation response:
 *
 *    - Typia.assert on the returned IShoppingMallSellerWarehouseAddress
 *    - Seller_warehouse_id equals warehouse.id
 *    - Country_id equals country.id
 *    - Country.id equals country.id from creation response and key fields like
 *         country_code, name_en match
 *    - Region_id is null (or undefined) and region is null (or undefined),
 *         confirming no region association was created
 *    - Recipient_name, line1, city, postal_code, phone match the request body
 * 8. Fetch the address again with GET
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}/address via
 *    api.functional.shoppingMall.seller.sellerWarehouses .address.at, assert
 *    type, and repeat the same logical validations to ensure the state
 *    persisted correctly.
 *
 * Implementation notes
 *
 * - Use typia.random and RandomGenerator to generate realistic emails, URLs,
 *   codes, names, and text fields.
 * - Use TestValidator.equals and TestValidator.predicate with descriptive titles
 *   for business-level assertions.
 * - Do not manipulate connection.headers directly; rely on the auth SDK functions
 *   to manage Authorization.
 * - Focus on the successful flow; no negative or type-error scenarios.
 */
export async function test_api_seller_warehouse_address_creation_without_region(
  connection: api.IConnection,
) {
  // 1. Seller join - establish seller account and auth context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 2. Create seller warehouse as the authenticated seller
  const warehouseCreateBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert(warehouse);

  // 3. Admin join to obtain admin auth context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14) as string &
    tags.Format<"password">;
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 4. Create a country as admin
  const countryCode = RandomGenerator.alphaNumeric(3).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "created country code matches request",
    country.country_code,
    countryCreateBody.country_code,
  );

  // 5. Switch back to seller context via seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerReAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReAuth);

  // 6. Create warehouse address WITHOUT region_id
  const addressCreateBody = {
    country_id: country.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;

  const createdAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: addressCreateBody,
      },
    );
  typia.assert(createdAddress);

  // 7. Validate creation response
  TestValidator.equals(
    "seller_warehouse_id should match warehouse.id",
    createdAddress.seller_warehouse_id,
    warehouse.id,
  );

  TestValidator.equals(
    "country_id should match created country.id",
    createdAddress.country_id,
    country.id,
  );

  TestValidator.equals(
    "country.id of address should match created country.id",
    createdAddress.country.id,
    country.id,
  );

  TestValidator.equals(
    "country_code should match between address.country and created country",
    createdAddress.country.country_code,
    country.country_code,
  );

  TestValidator.equals(
    "country name_en should match between address.country and created country",
    createdAddress.country.name_en,
    country.name_en,
  );

  TestValidator.equals(
    "recipient_name should match request body",
    createdAddress.recipient_name,
    addressCreateBody.recipient_name,
  );

  TestValidator.equals(
    "line1 should match request body",
    createdAddress.line1,
    addressCreateBody.line1,
  );

  TestValidator.equals(
    "line2 should match request body",
    createdAddress.line2 ?? null,
    addressCreateBody.line2 ?? null,
  );

  TestValidator.equals(
    "city should match request body",
    createdAddress.city,
    addressCreateBody.city,
  );

  TestValidator.equals(
    "postal_code should match request body",
    createdAddress.postal_code,
    addressCreateBody.postal_code,
  );

  TestValidator.equals(
    "phone should match request body",
    createdAddress.phone ?? null,
    addressCreateBody.phone ?? null,
  );

  TestValidator.equals(
    "region_id should be null or undefined when not provided",
    createdAddress.region_id ?? null,
    null,
  );

  TestValidator.equals(
    "region should be null or undefined when region_id is omitted",
    createdAddress.region ?? null,
    null,
  );

  // 8. Fetch the address again and re-validate persistence
  const fetchedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert(fetchedAddress);

  TestValidator.equals(
    "fetched seller_warehouse_id should match warehouse.id",
    fetchedAddress.seller_warehouse_id,
    warehouse.id,
  );

  TestValidator.equals(
    "fetched country_id should match created country.id",
    fetchedAddress.country_id,
    country.id,
  );

  TestValidator.equals(
    "fetched country.id should match created country.id",
    fetchedAddress.country.id,
    country.id,
  );

  TestValidator.equals(
    "fetched country_code should match created country.country_code",
    fetchedAddress.country.country_code,
    country.country_code,
  );

  TestValidator.equals(
    "fetched country name_en should match created country.name_en",
    fetchedAddress.country.name_en,
    country.name_en,
  );

  TestValidator.equals(
    "fetched recipient_name should match request body",
    fetchedAddress.recipient_name,
    addressCreateBody.recipient_name,
  );

  TestValidator.equals(
    "fetched line1 should match request body",
    fetchedAddress.line1,
    addressCreateBody.line1,
  );

  TestValidator.equals(
    "fetched line2 should match request body",
    fetchedAddress.line2 ?? null,
    addressCreateBody.line2 ?? null,
  );

  TestValidator.equals(
    "fetched city should match request body",
    fetchedAddress.city,
    addressCreateBody.city,
  );

  TestValidator.equals(
    "fetched postal_code should match request body",
    fetchedAddress.postal_code,
    addressCreateBody.postal_code,
  );

  TestValidator.equals(
    "fetched phone should match request body",
    fetchedAddress.phone ?? null,
    addressCreateBody.phone ?? null,
  );

  TestValidator.equals(
    "fetched region_id should still be null or undefined",
    fetchedAddress.region_id ?? null,
    null,
  );

  TestValidator.equals(
    "fetched region should still be null or undefined",
    fetchedAddress.region ?? null,
    null,
  );
}
