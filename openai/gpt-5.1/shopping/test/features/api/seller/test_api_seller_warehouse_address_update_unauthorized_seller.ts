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
 * Ensure that a seller cannot update another seller's warehouse address and
 * that the original address data remains unchanged after the failed attempt.
 *
 * Business context:
 *
 * - Each seller owns one or more warehouses.
 * - Warehouse addresses are sensitive operational data and must only be mutable
 *   by the owning seller (or admins through dedicated admin APIs).
 * - The seller-facing PUT
 *   /shoppingMall/seller/sellerWarehouses/{warehouseId}/address endpoint must
 *   enforce ownership-based authorization.
 *
 * Scenario steps:
 *
 * 1. Register Seller A via /auth/seller/join (connection now authenticated as
 *    Seller A).
 * 2. As Seller A, create a warehouse via POST
 *    /shoppingMall/seller/sellerWarehouses.
 * 3. Register an admin via /auth/admin/join (connection now authenticated as
 *    admin).
 * 4. As admin, create a country via POST /shoppingMall/admin/countries.
 * 5. As admin, create a region under that country via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions.
 * 6. Log back in as Seller A via /auth/seller/login.
 * 7. As Seller A, create an address for the warehouse via POST
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}/address using the
 *    created country_id and region_id.
 * 8. Register Seller B via /auth/seller/join (connection now authenticated as
 *    Seller B).
 * 9. As Seller B, attempt to update Seller A's warehouse address via PUT
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}/address using a valid
 *    IShoppingMallSellerWarehouseAddress.IUpdate payload.
 * 10. Expect the update call to be rejected with an authorization error; use
 *     TestValidator.error to assert that an error is thrown, without checking
 *     specific HTTP status codes.
 * 11. Log back in as Seller A via /auth/seller/login.
 * 12. As Seller A, GET /shoppingMall/seller/sellerWarehouses/{warehouseId}/address
 *     and verify that the business address fields are identical to the original
 *     address created in step 7, proving that Seller B's attempt did not modify
 *     the record.
 */
export async function test_api_seller_warehouse_address_update_unauthorized_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller-a.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller-a.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  // 2. Create a warehouse as Seller A
  const warehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Register an admin (connection switches to admin token)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 4. As admin, create a country
  const countryCode = RandomGenerator.alphaNumeric(3).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${countryCode}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 5. As admin, create a region under that country
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(4),
    name_en: "Seoul",
    region_type: "city",
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

  // 6. Log back in as Seller A
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://seller-a.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller-a.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerALoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoginAuth);

  // 7. As Seller A, create an address for the warehouse
  const originalAddressBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: "Seoul",
    postal_code: "06236",
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.ICreate;
  const originalAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.create(
      connection,
      {
        warehouseId: warehouse.id,
        body: originalAddressBody,
      },
    );
  typia.assert(originalAddress);

  // 8. Register Seller B (connection switches to Seller B token)
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller-b.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller-b.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  // 9–10. As Seller B, attempt to update Seller A's warehouse address
  const maliciousUpdateBody = {
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "Busan",
    postal_code: "48058",
    phone: RandomGenerator.mobile(),
    country_id: country.id,
    region_id: region.id,
  } satisfies IShoppingMallSellerWarehouseAddress.IUpdate;

  await TestValidator.error(
    "unauthorized seller cannot update another seller's warehouse address",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.address.update(
        connection,
        {
          warehouseId: warehouse.id,
          body: maliciousUpdateBody,
        },
      );
    },
  );

  // 11. Log back in as Seller A
  const sellerALoginAgainBody = {
    email: sellerAEmail,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://seller-a.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller-a.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerALoginAgainAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginAgainBody,
    });
  typia.assert(sellerALoginAgainAuth);

  // 12. As Seller A, reload the warehouse address and verify its business fields are unchanged
  const reloadedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      { warehouseId: warehouse.id },
    );
  typia.assert(reloadedAddress);

  // Compare only the mutable business fields to avoid false negatives from metadata changes
  TestValidator.equals(
    "recipient_name should remain unchanged after unauthorized update attempt",
    reloadedAddress.recipient_name,
    originalAddress.recipient_name,
  );
  TestValidator.equals(
    "line1 should remain unchanged after unauthorized update attempt",
    reloadedAddress.line1,
    originalAddress.line1,
  );
  TestValidator.equals(
    "line2 should remain unchanged after unauthorized update attempt",
    reloadedAddress.line2,
    originalAddress.line2,
  );
  TestValidator.equals(
    "city should remain unchanged after unauthorized update attempt",
    reloadedAddress.city,
    originalAddress.city,
  );
  TestValidator.equals(
    "postal_code should remain unchanged after unauthorized update attempt",
    reloadedAddress.postal_code,
    originalAddress.postal_code,
  );
  TestValidator.equals(
    "phone should remain unchanged after unauthorized update attempt",
    reloadedAddress.phone,
    originalAddress.phone,
  );
  TestValidator.equals(
    "country_id should remain unchanged after unauthorized update attempt",
    reloadedAddress.country_id,
    originalAddress.country_id,
  );
  TestValidator.equals(
    "region_id should remain unchanged after unauthorized update attempt",
    reloadedAddress.region_id,
    originalAddress.region_id,
  );
}
