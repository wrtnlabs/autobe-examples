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
 * Verify that updating a warehouse address fails when the warehouse has no
 * existing address.
 *
 * Business context: A seller warehouse has a 1:1 address record managed in
 * `shopping_mall_seller_warehouse_addresses`. The PUT
 * /shoppingMall/seller/sellerWarehouses/{warehouseId}/address endpoint is
 * documented as “update an existing seller warehouse address row”. When a
 * warehouse has no address row yet, clients are supposed to use POST (not
 * provided here) to create one first. This test ensures that calling PUT on
 * such a warehouse results in a failure instead of implicitly creating the
 * record.
 *
 * Scenario steps:
 *
 * 1. Register a seller via /auth/seller/join and obtain a seller session (token
 *    auto-wired by SDK).
 * 2. As that seller, create a warehouse via POST
 *    /shoppingMall/seller/sellerWarehouses, which does NOT create any address
 *    row.
 * 3. Register an admin via /auth/admin/join and log in as that admin.
 * 4. As admin, create a country via POST /shoppingMall/admin/countries using
 *    IShoppingMallCountry.ICreate.
 * 5. As admin, create a region for that country via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions using
 *    IShoppingMallRegion.ICreate.
 * 6. Switch back to the seller session using /auth/seller/login.
 * 7. Optionally try GET
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}/address and (because
 *    the SDK only models success responses) call it inside TestValidator.error
 *    to represent “no address exists yet” in a type-safe way.
 * 8. Build a valid IShoppingMallSellerWarehouseAddress.IUpdate payload using the
 *    created country.id and region.id as country_id and region_id, plus
 *    realistic address fields.
 * 9. Call PUT /shoppingMall/seller/sellerWarehouses/{warehouseId}/address with
 *    that payload, wrapping the call in await TestValidator.error("descriptive
 *    title", async () => ...) so that the test asserts that the update fails
 *    when no address row exists for the warehouse.
 * 10. Optionally, attempt GET again (also via TestValidator.error) to ensure the
 *     failed PUT did not implicitly create an address.
 *
 * Notes and constraints:
 *
 * - All authentication state switching must go through the provided auth APIs; do
 *   not touch connection.headers directly in the test.
 * - All request bodies must use `satisfies` with the correct DTO type
 *   (IShoppingMallSellerAuthJoin.IRequest,
 *   IShoppingMallSellerAuthLogin.IRequest, IShoppingMallAdminJoin.ICreate,
 *   IShoppingMallAdminLogin.ICreate, IShoppingMallCountry.ICreate,
 *   IShoppingMallRegion.ICreate, IShoppingMallSellerWarehouse.ICreate,
 *   IShoppingMallSellerWarehouseAddress.IUpdate).
 * - All API calls must be awaited; all non-void responses must be validated with
 *   typia.assert().
 * - TestValidator.error must always be given a descriptive title as its first
 *   parameter and must be awaited when used with an async closure.
 */
export async function test_api_seller_warehouse_address_update_for_nonexistent_address(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerEmail: string & tags.Format<"email"> = sellerAuthorized.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 2. Create a warehouse as the seller (connection now holds seller token)
  const warehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
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
  typia.assert<IShoppingMallSellerWarehouse>(warehouse);

  // 3. Register an admin and 4–5. create country/region as that admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(4),
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
  typia.assert<IShoppingMallRegion>(region);

  // 6. Switch back to seller via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAfterLogin);

  // 7. Optionally confirm that GET address does not succeed when no address exists
  await TestValidator.error(
    "get warehouse address should fail when no address exists",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
        connection,
        {
          warehouseId: warehouse.id,
        },
      );
    },
  );

  // 8. Build a valid update payload using created country and region IDs
  const updateBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerWarehouseAddress.IUpdate;

  // 9. Assert that update fails because there is no existing address to update
  await TestValidator.error(
    "updating warehouse address without existing row should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.address.update(
        connection,
        {
          warehouseId: warehouse.id,
          body: updateBody,
        },
      );
    },
  );

  // 10. Optionally confirm again that GET still fails (no implicit creation)
  await TestValidator.error(
    "warehouse address should still be absent after failed update",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
        connection,
        {
          warehouseId: warehouse.id,
        },
      );
    },
  );
}
