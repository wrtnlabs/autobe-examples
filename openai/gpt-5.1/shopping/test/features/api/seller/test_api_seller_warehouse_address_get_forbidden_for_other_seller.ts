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

export async function test_api_seller_warehouse_address_get_forbidden_for_other_seller(
  connection: api.IConnection,
) {
  // 1. Seller A joins
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAJoinRequest = {
    email: sellerAEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller-a.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinRequest,
    });
  typia.assert(sellerA);

  // 2. Admin joins and logs in to create master data
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinRequest = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(20) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.join.example.com/",
    referrer: "https://admin-landing.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminJoin);

  const adminLoginRequest = {
    email: adminEmail,
    password: adminJoinRequest.password,
    ip: null,
    href: "https://admin.login.example.com/",
    referrer: "https://admin-landing.example.com/login",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLogin);

  // 3. Create country and region via admin
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Test Country",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCode = RandomGenerator.alphabets(5).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4. Switch back to Seller A (login) and create a warehouse
  const sellerALoginRequest = {
    email: sellerAEmail,
    password: sellerAJoinRequest.password,
    ip: null,
    href: "https://seller-a.login.example.com/",
    referrer: "https://landing.example.com/login",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginRequest,
    });
  typia.assert(sellerALogin);

  const warehouseCreateBody = {
    code: `WH-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: "Seller A Main Warehouse",
    description: "Primary warehouse for Seller A",
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

  // 5. Create address for Seller A's warehouse
  const addressCreateBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: "Warehouse Contact A",
    line1: "123 Test Street",
    line2: "Suite 456",
    city: "Seoul",
    postal_code: "12345",
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

  // 6. Create Seller B (separate seller actor)
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBJoinRequest = {
    email: sellerBEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller-b.join.example.com/",
    referrer: "https://landing.example.com/seller-b",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinRequest,
    });
  typia.assert(sellerB);

  const sellerBLoginRequest = {
    email: sellerBEmail,
    password: sellerBJoinRequest.password,
    ip: null,
    href: "https://seller-b.login.example.com/",
    referrer: "https://landing.example.com/seller-b/login",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginRequest,
    });
  typia.assert(sellerBLogin);

  // 7. Attempt to GET Seller A's warehouse address as Seller B and expect an error
  await TestValidator.error(
    "other seller cannot access warehouse address",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
        connection,
        {
          warehouseId: warehouse.id,
        },
      );
    },
  );

  // 8. Switch back to Seller A and confirm address is still accessible
  const sellerALoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginRequest,
    });
  typia.assert(sellerALoginAgain);

  const fetchedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert(fetchedAddress);

  // Compare that fetched address matches the one created earlier
  TestValidator.equals(
    "owner seller can read own warehouse address and matches created address",
    fetchedAddress,
    createdAddress,
  );
}
