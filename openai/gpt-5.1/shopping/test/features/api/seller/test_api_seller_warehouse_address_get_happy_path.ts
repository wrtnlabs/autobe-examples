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
 * Happy-path retrieval of a seller warehouse address after full setup.
 *
 * Business workflow validated by this test:
 *
 * 1. A seller joins the platform and obtains an authenticated context.
 * 2. An admin joins and configures master geography data (country + region).
 * 3. The seller creates a warehouse.
 * 4. The seller creates an address for that warehouse, referencing the country and
 *    region.
 * 5. The seller retrieves the warehouse address via GET and receives the same
 *    data.
 *
 * This validates:
 *
 * - That seller/auth flows work end-to-end for both seller and admin.
 * - That country and region created by admin can be referenced from a seller
 *   warehouse address.
 * - That POST /shoppingMall/seller/sellerWarehouses/{warehouseId}/address
 *   persists correct data and that GET
 *   /shoppingMall/seller/sellerWarehouses/{warehouseId}/address returns a
 *   consistent IShoppingMallSellerWarehouseAddress.
 * - That ownership/tenant boundaries are respected by using the same seller token
 *   for both address creation and retrieval (no cross-seller leakage).
 */
export async function test_api_seller_warehouse_address_get_happy_path(
  connection: api.IConnection,
) {
  // 1. Seller join (self-registration)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerEmail: string & tags.Format<"email"> = sellerJoin.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 2. (Optional) seller login again to simulate explicit login flow
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 3. Admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14) as string &
      tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminEmail: string & tags.Format<"email"> = adminJoin.email;
  const adminPassword: string & tags.Format<"password"> =
    adminJoinBody.password;

  // 4. Admin login (simulate subsequent admin session)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 5. As admin, create a country
  const countryCode = `CTY-${RandomGenerator.alphaNumeric(6)}`;

  const countryCreateBody = {
    country_code: countryCode,
    name_en: "E2E Test Country",
    phone_code: "+999",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  TestValidator.equals(
    "created country_code must match request",
    country.country_code,
    countryCode,
  );

  // 6. As admin, create a region under that country
  const regionCode = `RG-${RandomGenerator.alphaNumeric(4)}`;

  const regionCreateBody = {
    code: regionCode,
    name_en: "E2E Test Region",
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
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "created region code must match request",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region country id matches created country",
    region.country.id,
    country.id,
  );

  // 7. Switch back to seller by logging in again
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerReLogin);

  // 8. Seller creates a warehouse
  const warehouseCreateBody = {
    code: `WH-${RandomGenerator.alphaNumeric(5)}`,
    name: "E2E Test Warehouse",
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
  typia.assert<IShoppingMallSellerWarehouse>(warehouse);

  TestValidator.equals(
    "warehouse code matches creation payload",
    warehouse.code,
    warehouseCreateBody.code,
  );
  TestValidator.equals(
    "warehouse is_default_origin matches creation payload",
    warehouse.is_default_origin,
    warehouseCreateBody.is_default_origin,
  );

  // 9. Seller creates an address for that warehouse
  const addressCreateBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: "E2E City",
    postal_code: RandomGenerator.alphaNumeric(8),
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
  typia.assert<IShoppingMallSellerWarehouseAddress>(createdAddress);

  TestValidator.equals(
    "created address is bound to the warehouse",
    createdAddress.seller_warehouse_id,
    warehouse.id,
  );
  TestValidator.equals(
    "created address country_id matches",
    createdAddress.country_id,
    country.id,
  );
  TestValidator.equals(
    "created address region_id matches",
    createdAddress.region_id,
    region.id,
  );

  // 10. GET the warehouse address as the same seller
  const fetchedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert<IShoppingMallSellerWarehouseAddress>(fetchedAddress);

  // 11. Validate basic identity and ownership bindings
  TestValidator.equals(
    "fetched address seller_warehouse_id must equal warehouse.id",
    fetchedAddress.seller_warehouse_id,
    warehouse.id,
  );
  TestValidator.equals(
    "fetched address country_id must equal created country id",
    fetchedAddress.country_id,
    country.id,
  );
  TestValidator.equals(
    "fetched address region_id must equal created region id",
    fetchedAddress.region_id,
    region.id,
  );

  // 12. Validate nested country & region summaries
  TestValidator.equals(
    "nested country summary id matches country id",
    fetchedAddress.country.id,
    country.id,
  );
  TestValidator.equals(
    "nested country summary code matches",
    fetchedAddress.country.country_code,
    country.country_code,
  );
  TestValidator.equals(
    "nested country summary name_en matches",
    fetchedAddress.country.name_en,
    country.name_en,
  );

  if (fetchedAddress.region !== null && fetchedAddress.region !== undefined) {
    TestValidator.equals(
      "nested region summary id matches region id",
      fetchedAddress.region.id,
      region.id,
    );
    TestValidator.equals(
      "nested region summary code matches",
      fetchedAddress.region.code,
      region.code,
    );
    TestValidator.equals(
      "nested region summary name_en matches",
      fetchedAddress.region.name_en,
      region.name_en,
    );
    TestValidator.equals(
      "nested region summary country id matches",
      fetchedAddress.region.country.id,
      country.id,
    );
  }

  // 13. Validate address field consistency between POST and GET
  TestValidator.equals(
    "recipient_name is preserved",
    fetchedAddress.recipient_name,
    addressCreateBody.recipient_name,
  );
  TestValidator.equals(
    "line1 is preserved",
    fetchedAddress.line1,
    addressCreateBody.line1,
  );
  TestValidator.equals(
    "line2 is preserved",
    fetchedAddress.line2,
    addressCreateBody.line2,
  );
  TestValidator.equals(
    "city is preserved",
    fetchedAddress.city,
    addressCreateBody.city,
  );
  TestValidator.equals(
    "postal_code is preserved",
    fetchedAddress.postal_code,
    addressCreateBody.postal_code,
  );
  TestValidator.equals(
    "phone is preserved",
    fetchedAddress.phone,
    addressCreateBody.phone,
  );
}
