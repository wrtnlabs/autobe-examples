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
 * Validate basic creation and persistence of a seller warehouse address.
 *
 * Business flow:
 *
 * 1. A seller joins and becomes authenticated.
 * 2. The seller creates a new warehouse with status "active" and default-origin
 *    flag.
 * 3. An admin joins and becomes authenticated.
 * 4. The admin creates an active country master record.
 * 5. The admin creates an active region under that country.
 * 6. The seller authenticates again (switch back to seller actor).
 * 7. The seller creates a warehouse address for the previously created warehouse,
 *    referencing the created country and region.
 * 8. The seller fetches the warehouse address to confirm persistence.
 * 9. The test asserts that:
 *
 *    - The returned address is a valid IShoppingMallSellerWarehouseAddress.
 *    - Seller_warehouse_id matches the warehouse id.
 *    - Country_id and region_id match the master records.
 *    - Address fields match the submitted payload.
 *    - Created_at and updated_at are present and updated_at >= created_at.
 */
export async function test_api_seller_warehouse_address_creation_basic(
  connection: api.IConnection,
) {
  // 1. Seller joins and becomes authenticated.
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a new warehouse.
  const warehouseCreateBody = {
    code: `WH-${RandomGenerator.alphaNumeric(8)}`,
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
  typia.assert(warehouse);

  // 3. Admin joins and becomes authenticated.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Admin creates an active country.
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${countryCode}`,
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 5. Admin creates an active region under that country.
  const regionCode = `R-${RandomGenerator.alphaNumeric(4)}`;
  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${regionCode}`,
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

  // 6. Switch back to seller by logging in as seller again.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: sellerJoinBody.ip ?? null,
    href: sellerJoinBody.href,
    referrer: sellerJoinBody.referrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 7. Seller creates warehouse address referencing created country and region.
  const addressCreateBody = {
    country_id: country.id,
    region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
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

  // 8. Optionally fetch the address again to confirm persistence.
  const fetchedAddress: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert(fetchedAddress);

  // 9. Business assertions
  TestValidator.equals(
    "createdAddress seller_warehouse_id should match warehouse.id",
    createdAddress.seller_warehouse_id,
    warehouse.id,
  );
  TestValidator.equals(
    "fetchedAddress seller_warehouse_id should match warehouse.id",
    fetchedAddress.seller_warehouse_id,
    warehouse.id,
  );

  TestValidator.equals(
    "createdAddress country_id should match country.id",
    createdAddress.country_id,
    country.id,
  );
  TestValidator.equals(
    "createdAddress region_id should match region.id",
    createdAddress.region_id ?? null,
    region.id,
  );

  TestValidator.equals(
    "createdAddress recipient_name should match request body",
    createdAddress.recipient_name,
    addressCreateBody.recipient_name,
  );
  TestValidator.equals(
    "createdAddress line1 should match request body",
    createdAddress.line1,
    addressCreateBody.line1,
  );
  TestValidator.equals(
    "createdAddress line2 should match request body",
    createdAddress.line2 ?? null,
    addressCreateBody.line2 ?? null,
  );
  TestValidator.equals(
    "createdAddress city should match request body",
    createdAddress.city,
    addressCreateBody.city,
  );
  TestValidator.equals(
    "createdAddress postal_code should match request body",
    createdAddress.postal_code,
    addressCreateBody.postal_code,
  );
  TestValidator.equals(
    "createdAddress phone should match request body",
    createdAddress.phone ?? null,
    addressCreateBody.phone ?? null,
  );

  // Compare fetched address to created address deeply.
  TestValidator.equals(
    "fetchedAddress should equal createdAddress structurally",
    fetchedAddress,
    createdAddress,
  );

  // Validate timestamp consistency: created_at and updated_at must exist and updated_at >= created_at.
  const createdAt = new Date(createdAddress.created_at).getTime();
  const updatedAt = new Date(createdAddress.updated_at).getTime();

  TestValidator.predicate(
    "created_at should be a valid timestamp",
    !Number.isNaN(createdAt),
  );
  TestValidator.predicate(
    "updated_at should be a valid timestamp",
    !Number.isNaN(updatedAt),
  );
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAt >= createdAt,
  );
}
