import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_active_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(category);
  // Step 3: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 4: Create product in the category
  const createdProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(createdProduct);
  // Step 5: Retrieve product by ID
  const retrievedProduct = await api.functional.ecommerceMall.products.at(
    sellerConnection,
    {
      productId: createdProduct.id,
    },
  );
  typia.assert(retrievedProduct);
  // Step 6: Validate response contains expected product details
  TestValidator.equals(
    "product id matches",
    retrievedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    createdProduct.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    createdProduct.description,
  );
  TestValidator.equals(
    "product basePrice matches",
    retrievedProduct.base_price,
    createdProduct.base_price,
  );
  // Validate category information
  TestValidator.equals(
    "category id matches",
    retrievedProduct.category.id,
    category.id,
  );
  // Validate seller information exists
  TestValidator.predicate("seller info exists", !!retrievedProduct.seller);
  TestValidator.predicate("seller has id", !!retrievedProduct.seller?.id);
  // Validate arrays are present (images and variants)
  TestValidator.predicate(
    "images array exists",
    Array.isArray(retrievedProduct.images),
  );
  TestValidator.predicate(
    "variants array exists",
    Array.isArray(retrievedProduct.variants),
  );
  // Validate timestamps exist
  TestValidator.predicate("created_at exists", !!retrievedProduct.created_at);
  TestValidator.predicate("updated_at exists", !!retrievedProduct.updated_at);
}