import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_update_category_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create initial category IDs (simulating two different categories)
  const initialCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create product in initial category
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: initialCategoryId,
      },
    },
  );
  typia.assert(product);
  // Store original values for comparison
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.basePrice;
  const originalUpdatedAt = product.updatedAt;
  const originalVariantCount = product.variants.length;
  const originalImageCount = product.productImages.length;
  // 4. Update product with new category_id
  const updatedProduct = await api.functional.ecommerce.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        category_id: newCategoryId,
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct);
  // 5. Verify category_id changed
  TestValidator.equals(
    "category_id updated",
    updatedProduct.category.id,
    newCategoryId,
  );
  // 6. Verify all other product data preserved
  TestValidator.equals("name preserved", updatedProduct.name, originalName);
  TestValidator.equals(
    "description preserved",
    updatedProduct.description,
    originalDescription,
  );
  TestValidator.equals(
    "base_price preserved",
    updatedProduct.basePrice,
    originalBasePrice,
  );
  TestValidator.equals(
    "variant count preserved",
    updatedProduct.variants.length,
    originalVariantCount,
  );
  TestValidator.equals(
    "image count preserved",
    updatedProduct.productImages.length,
    originalImageCount,
  );
  // 7. Verify updated_at changed (snapshot was created)
  TestValidator.notEquals(
    "updated_at changed",
    updatedProduct.updatedAt,
    originalUpdatedAt,
  );
  // 8. Verify product ID remains the same
  TestValidator.equals("product id unchanged", updatedProduct.id, product.id);
}
