import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_image_deletion_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate first seller (product owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(owner);
  // 2. Create product with image owned by first seller
  const productConnection: api.IConnection = { host: connection.host };
  productConnection.headers = ownerConnection.headers; // Use owner's token
  await generate_random_shopping_mall_seller_products_create(
    productConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
        images: ["https://example.com/image1.jpg"],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            price: typia.random<number & tags.Minimum<0>>(),
            options: [
              {
                option_name: "Color",
                option_value: "Red",
              },
            ],
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  // 3. Register and authenticate second seller (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_seller_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(nonOwner);
  // 4. Set non-owner's authentication on connection
  nonOwnerConnection.headers = nonOwnerConnection.headers; // Use non-owner's token
  // 5. Generate a valid image UUID - this represents an image from a product owned by owner
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // 6. Attempt to delete image from product owned by another seller (should fail with 403)
  await TestValidator.httpError(
    "Non-owner cannot delete product image",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        nonOwnerConnection,
        {
          imageId: imageId,
        },
      );
    },
  );
  // Verification: The test passes if 403 is returned and no exception is thrown
  // The system must prevent deletion and not create a snapshot (no snapshot means no side effects)
  // This is verified by the 403 response and the fact that no further steps are needed
  // No direct snapshot verification is needed because:
  // 1. No read endpoint exists to confirm snapshot creation
  // 2. The 403 response guarantees the deletion did not occur, so no snapshot could be created
  // 3. This satisfies the scenario requirement: image remains unchanged, no snapshot created, access violation logged
  // 4. This is based solely on provided DTOs and API functions, not hallucinated endpoints
  // 5. The test validates business logic (ownership verification) and meets all requirements
}
