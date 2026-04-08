import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that product name uniqueness constraint is enforced per seller.
 *
 * Validates that a seller cannot update a product to have a duplicate name within their catalog. The system enforces a unique constraint on the combination of seller ID and product name.
 *
 * This test verifies the business rule by attempting to update an existing product's name to match another product's name owned by the same seller, expecting the operation to fail.
 *
 * 1. Register and authenticate as a seller with random credentials.
 * 2. Create a first product with name "Product A".
 * 3. Create a second product with name "Product B".
 * 4. Attempt to update "Product B" to have the name "Product A" (duplicate).
 * 5. Verify the update fails with an appropriate error.
 */
export async function test_api_product_update_name_uniqueness_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create first product with name "Product A"
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product A",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 3. Create second product with name "Product B"
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product B",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 4. Attempt to update "Product B" to have name "Product A" (duplicate)
  await TestValidator.error("duplicate product name should fail", async () => {
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: productB.id,
      body: {
        name: "Product A",
      } satisfies IShoppingMallProduct.IUpdate,
    });
  });
  // 5. Verify the original products remain unchanged by fetching them
  const refreshedProductA =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: productA.id,
      body: {} satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(refreshedProductA);
  TestValidator.equals(
    "Product A name unchanged",
    refreshedProductA.name,
    "Product A",
  );
  const refreshedProductB =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: productB.id,
      body: {} satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(refreshedProductB);
  TestValidator.equals(
    "Product B name unchanged",
    refreshedProductB.name,
    "Product B",
  );
}
