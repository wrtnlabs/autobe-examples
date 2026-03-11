import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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

export async function test_api_seller_product_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Setup - Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Product Creation - Create initial product
  const productConnection: api.IConnection = { host: connection.host };
  const product = await generate_random_ecommerce_mall_seller_products_create(
    productConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Store original values for comparison
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  const originalCategoryId = product.category.id;
  const originalIsActive = product.is_active;
  const originalCreatedAt = product.created_at;
  const originalSellerId = product.seller.id;
  const originalVariantCount = product.variants.length;
  const originalImageCount = product.images.length;
  // 3. Product Update - Update the product with new values
  const newName = RandomGenerator.paragraph({ sentences: 4 });
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newBasePrice = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
  >();
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      productConnection,
      {
        productId: product.id,
        body: {
          name: newName,
          description: newDescription,
          base_price: newBasePrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 4. Validation - Verify update success
  TestValidator.equals("product name updated", updatedProduct.name, newName);
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    newDescription,
  );
  TestValidator.equals(
    "product base_price updated",
    updatedProduct.base_price,
    newBasePrice,
  );
  TestValidator.notEquals(
    "updated_at changed",
    originalCreatedAt,
    updatedProduct.updated_at,
  );
  // Verify ownership preserved
  TestValidator.equals(
    "seller_id unchanged",
    originalSellerId,
    updatedProduct.seller.id,
  );
  TestValidator.equals(
    "seller email unchanged",
    product.seller.email,
    updatedProduct.seller.email,
  );
  // Verify other fields unchanged
  TestValidator.equals("id unchanged", product.id, updatedProduct.id);
  TestValidator.equals(
    "category unchanged",
    originalCategoryId,
    updatedProduct.category.id,
  );
  TestValidator.equals(
    "category name unchanged",
    product.category.name,
    updatedProduct.category.name,
  );
  TestValidator.equals(
    "is_active unchanged",
    originalIsActive,
    updatedProduct.is_active,
  );
  TestValidator.equals(
    "variants count unchanged",
    originalVariantCount,
    updatedProduct.variants.length,
  );
  TestValidator.equals(
    "images count unchanged",
    originalImageCount,
    updatedProduct.images.length,
  );
}