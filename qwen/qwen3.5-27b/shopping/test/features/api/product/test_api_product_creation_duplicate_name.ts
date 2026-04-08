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
 * Test that product creation fails when attempting to create a product with a name that already exists for the same seller.
 *
 * Validates the product name uniqueness constraint per seller. When a seller attempts to create a product with a name that already exists in their catalog, the system should reject the request with a 409 Conflict status. This test ensures that the duplicate name constraint is properly enforced at the database level and that the API returns appropriate error responses.
 *
 * The test verifies that the first product creation succeeds, the second product creation with the same name fails with 409 Conflict, and the original product remains unchanged. This constraint is per-seller, meaning different sellers can have products with the same name.
 *
 * 1. Register a new seller account and authenticate via /shoppingMall/auth/seller/join
 * 2. Create a product with a specific name (e.g., "Test Product")
 * 3. Attempt to create another product with the exact same name
 * 4. Verify the second product creation fails with 409 Conflict status
 * 5. Verify the error response indicates duplicate product name
 */
export async function test_api_product_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create first product with a specific name
  const productName = RandomGenerator.name(2);
  const firstProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: productName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(firstProduct);
  // 3. Attempt to create second product with the same name (should fail with 409 Conflict)
  await TestValidator.httpError(
    "duplicate product name should fail with 409 Conflict",
    409,
    async () => {
      await generate_random_shopping_mall_seller_products_create(
        sellerConnection,
        {
          body: {
            name: productName, // Same name as first product
            description: RandomGenerator.paragraph({ sentences: 3 }),
            base_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          },
        },
      );
    },
  );
}
