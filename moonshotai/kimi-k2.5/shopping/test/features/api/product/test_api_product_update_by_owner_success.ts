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

/**
 * Test successful product update by an approved seller who owns the product.
 * The seller should be able to modify product details including name, description, and base price.
 * When the update succeeds, verify that:
 * 1. The product record is updated with new values
 * 2. The updated_at timestamp is refreshed to current time
 * 3. The response returns the complete updated product entity
 */
export async function test_api_product_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections (connection isolation pattern)
  const sellerConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Register seller via POST /auth/seller/join
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Register admin via POST /auth/admin/join
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 3. Admin approves the seller via PUT /admin/sellers/{sellerId}/status
  await api.functional.ecommerceMall.admin.sellers.status.updateStatus(
    adminConnection,
    {
      sellerId: seller.id,
      body: {
        approvalStatus: "approved",
      } satisfies IEcommerceMallSeller.IUpdateStatus,
    },
  );
  // 4. Create category via POST /admin/categories
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Create product via POST /seller/products
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // Store original timestamp for comparison
  const originalUpdatedAt = product.updatedAt;
  // 6. Update product via PUT /seller/products/{productId} with new values
  const updateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    basePrice: typia.random<number & tags.Minimum<0.01>>(),
  } satisfies IEcommerceMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProduct);
  // 7. Verify the update response
  TestValidator.equals(
    "name matches update request",
    updatedProduct.name,
    updateBody.name,
  );
  TestValidator.equals(
    "description matches update request",
    updatedProduct.description,
    updateBody.description,
  );
  TestValidator.equals(
    "basePrice matches update request",
    updatedProduct.basePrice,
    updateBody.basePrice,
  );
  TestValidator.equals("product id unchanged", updatedProduct.id, product.id);
  TestValidator.equals("seller unchanged", updatedProduct.seller.id, seller.id);
  TestValidator.predicate(
    "updatedAt timestamp is newer",
    new Date(updatedProduct.updatedAt) > new Date(originalUpdatedAt),
  );
}
