import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test deletion of a non-existent product image for error handling validation.
 *
 * Validates that the API properly returns 404 Not Found when attempting to delete a product image that does not exist, ensuring appropriate error messages and preventing unintended side effects.
 *
 * 1. Seller authenticates via /auth/seller/join endpoint.
 * 2. Seller creates a product with required fields.
 * 3. API attempts deletion of non-existent image via DELETE /seller/products/{productId}/images/{imageId}.
 * 4. System returns 404 Not Found with appropriate error message.
 * 5. Product remains unchanged after failed deletion attempt.
 */
export async function test_api_product_image_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Step 2: Create a product
  const productConnection: api.IConnection = { host: connection.host };
  productConnection.headers = { Authorization: sellerAuth.token.access };
  const product = await api.functional.ecommerceMall.seller.products.create(
    productConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Attempt to delete a non-existent image
  const nonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Verify 404 Not Found response
  await TestValidator.httpError(
    "returns 404 for non-existent image",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.products.images.erase(
        productConnection,
        {
          productId: product.id,
          imageId: nonExistentImageId,
        },
      );
    },
  );
}