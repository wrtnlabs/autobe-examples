import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function test_api_seller_product_retrieval_without_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product without any images using the generation utility
  // The generation function handles category selection internally
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Test Product Without Images - ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<0>>(),
      },
    },
  );
  typia.assert(product);
  // 3. Retrieve the product using the GET endpoint
  const retrievedProduct =
    await api.functional.ecommerceMall.seller.products.at(sellerConnection, {
      productId: product.id,
    });
  typia.assert(retrievedProduct);
  // 4. Validate the retrieved product has no images
  TestValidator.equals(
    "product_images should be empty",
    retrievedProduct.product_images.length,
    0,
  );
  // Verify the product details match what was created
  TestValidator.equals(
    "product name should match",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description should match",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price should match",
    retrievedProduct.base_price,
    product.base_price,
  );
  // Verify product is not soft-deleted
  TestValidator.equals(
    "deleted_at should be null",
    retrievedProduct.deleted_at,
    null,
  );
  // Verify seller information is included
  TestValidator.predicate(
    "seller information should be present",
    retrievedProduct.seller !== undefined && retrievedProduct.seller !== null,
  );
  // Verify category information is included
  TestValidator.predicate(
    "category information should be present",
    retrievedProduct.category !== undefined &&
      retrievedProduct.category !== null,
  );
  // Verify variants array exists
  TestValidator.predicate(
    "variants array should exist",
    Array.isArray(retrievedProduct.variants),
  );
  // Verify reviews array exists
  TestValidator.predicate(
    "reviews array should exist",
    Array.isArray(retrievedProduct.reviews),
  );
  // Verify reviews count is 0 for new product
  TestValidator.equals(
    "reviews_count should be 0",
    retrievedProduct.reviews_count,
    0,
  );
  // Verify average rating is 0 for new product
  TestValidator.equals(
    "average_rating should be 0",
    retrievedProduct.average_rating,
    0,
  );
}
