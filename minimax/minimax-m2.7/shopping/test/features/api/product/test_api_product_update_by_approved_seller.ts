import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_update_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category for product assignment
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller setup - register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create initial product with original values
  const originalProduct =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(originalProduct);
  // Store original values for comparison
  const originalName = originalProduct.name;
  const originalDescription = originalProduct.description;
  const originalBasePrice = originalProduct.basePrice;
  const originalCategoryId = originalProduct.category.id;
  // Generate new values for update
  const newName = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.content({ paragraphs: 3 });
  const newBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2000>
  >();
  // 5. Update product with new values
  const updatedProduct =
    await api.functional.ecommerceMall.seller.sellers.me.products.putByProductid(
      sellerConnection,
      {
        productId: originalProduct.id,
        body: {
          name: newName,
          description: newDescription,
          basePrice: newBasePrice,
          categoryId: originalCategoryId,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 6. Validate updated product
  TestValidator.equals("product name is updated", updatedProduct.name, newName);
  TestValidator.equals(
    "product description is updated",
    updatedProduct.description,
    newDescription,
  );
  TestValidator.equals(
    "product base price is updated",
    updatedProduct.basePrice,
    newBasePrice,
  );
  TestValidator.equals(
    "category remains unchanged",
    updatedProduct.category.id,
    originalCategoryId,
  );
  TestValidator.notEquals(
    "updatedAt is different from original",
    updatedProduct.updatedAt,
    originalProduct.updatedAt,
  );
}
