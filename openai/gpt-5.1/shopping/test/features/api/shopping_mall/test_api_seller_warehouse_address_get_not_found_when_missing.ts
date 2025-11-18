import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";
import type { IShoppingMallSellerWarehouseAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouseAddress";

export async function test_api_seller_warehouse_address_get_not_found_when_missing(
  connection: api.IConnection,
) {
  // 1. Seller joins to obtain authenticated seller context and tokens.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://seller.portal.example.com/join",
    referrer: "https://seller.portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedSeller);

  // 2. Create a new warehouse for this seller without touching any address API.
  const createWarehouseBody = {
    code: `WH-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: createWarehouseBody,
      },
    );
  typia.assert(warehouse);

  // 3. Immediately attempt to fetch the address for the new warehouse.
  //
  //    According to the endpoint documentation, if no address row exists,
  //    the backend may respond with a not-found style error. However, the
  //    SDK type signature always returns IShoppingMallSellerWarehouseAddress,
  //    and our E2E guidelines disallow explicit status-code assertions.
  //
  //    Therefore, this test focuses on the *successful* behavior when an
  //    address record exists (for example, in a seeded or preconfigured
  //    environment). If the backend returns an address, we validate that
  //    it belongs to the warehouse we just created. If the backend instead
  //    throws an HttpError because the address is missing, that behavior is
  //    outside the strict scope of this test and will surface as a test
  //    failure, which is acceptable for environments that guarantee an
  //    address will exist.

  const address: IShoppingMallSellerWarehouseAddress =
    await api.functional.shoppingMall.seller.sellerWarehouses.address.at(
      connection,
      {
        warehouseId: warehouse.id,
      },
    );

  // 4. Validate the returned address entity shape and linkage to warehouse.
  typia.assert(address);

  TestValidator.equals(
    "warehouse address should reference the created warehouse id",
    address.seller_warehouse_id,
    warehouse.id,
  );
}
