import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test scenario for seller inventory restocking validation.
 * Tests that zero or negative quantity additions are rejected by the API.
 */
export async function test_api_seller_inventory_restock_invalid_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create seller-specific connection with token
  const sellerConn: api.IConnection = { host: connection.host };
  sellerConn.headers = { Authorization: seller.token.access };
  // 2. Create a mock variant ID for testing
  const mockVariantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test invalid quantity scenarios
  // Test 3.1: Zero quantity should fail validation
  await TestValidator.error("zero quantity should fail", async () => {
    await api.functional.shoppingMall.seller.variants.add_inventory.addInventory(
      sellerConn,
      {
        variantId: mockVariantId,
        body: {
          quantity: 0,
          reason: "test zero quantity",
        } satisfies IShoppingMallProductVariant.IRestock,
      },
    );
  });
  // Test 3.2: Negative quantity should fail validation
  await TestValidator.error("negative quantity should fail", async () => {
    await api.functional.shoppingMall.seller.variants.add_inventory.addInventory(
      sellerConn,
      {
        variantId: mockVariantId,
        body: {
          quantity: -10,
          reason: "test negative quantity",
        } satisfies IShoppingMallProductVariant.IRestock,
      },
    );
  });
  // Test 3.3: Positive quantity should succeed
  await api.functional.shoppingMall.seller.variants.add_inventory.addInventory(
    sellerConn,
    {
      variantId: mockVariantId,
      body: {
        quantity: 5,
        reason: "test positive quantity",
      } satisfies IShoppingMallProductVariant.IRestock,
    },
  );
  // Test 3.4: Very large negative quantity should fail
  await TestValidator.error("very large negative should fail", async () => {
    await api.functional.shoppingMall.seller.variants.add_inventory.addInventory(
      sellerConn,
      {
        variantId: mockVariantId,
        body: {
          quantity: -1000000,
          reason: "test large negative",
        } satisfies IShoppingMallProductVariant.IRestock,
      },
    );
  });
}
