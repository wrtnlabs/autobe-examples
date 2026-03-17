import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_admin_update_success_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create first category for initial product creation
  const firstCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(firstCategory);
  // 3. Create second category for testing category change during update
  const secondCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(secondCategory);
  // 4. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 5. Create product as seller using first category
  const originalProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: firstCategory.id,
        },
      },
    );
  typia.assert(originalProduct);
  // Store original timestamp for comparison
  const originalUpdatedAt = originalProduct.updatedAt;
  // 6. Prepare update data with new values
  const updateBody = {
    name: `${originalProduct.name} - Updated by Admin`,
    description: `${originalProduct.description} [Admin Modified]`,
    categoryId: secondCategory.id,
    basePrice: originalProduct.basePrice + 100,
  } satisfies IEcommerceMallProduct.IUpdate;
  // 7. Admin updates the product
  const updatedProduct =
    await api.functional.ecommerceMall.admin.products.update(adminConnection, {
      productId: originalProduct.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);
  // 8. Verify all fields reflect the new values
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updateBody.name,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updateBody.description,
  );
  TestValidator.equals(
    "product category updated to second category",
    updatedProduct.category.id,
    updateBody.categoryId,
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.basePrice,
    updateBody.basePrice,
  );
  // 9. Verify updatedAt timestamp is refreshed (different from original)
  TestValidator.notEquals(
    "updatedAt timestamp refreshed",
    updatedProduct.updatedAt,
    originalUpdatedAt,
  );
  // 10. Verify updatedAt is newer than the original timestamp
  TestValidator.predicate(
    "updatedAt is newer than original",
    new Date(updatedProduct.updatedAt) > new Date(originalUpdatedAt),
  );
}
