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

/**
 * Test that an administrator receives 404 error when attempting to retrieve a soft-deleted product.
 *
 * Validates that the admin product retrieval endpoint properly handles soft-deleted products by returning a 404 Not Found response. This ensures that deleted products are not accessible even to administrators through direct product retrieval, maintaining data integrity and proper soft-delete behavior in the system.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Administrator creates a category for product classification.
 * 4. Seller creates a product under the category.
 * 5. Administrator deletes the product (soft delete).
 * 6. Administrator attempts to retrieve the deleted product.
 * 7. Validates that the response is 404 Not Found.
 *
 * The soft-deleted product should not be accessible via the admin retrieval endpoint,
 * even though the product data is preserved in the database for historical reference.
 */
export async function test_api_product_admin_retrieval_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller for product ownership
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Create category for product
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Create product (seller needs to be approved first - but join already creates approved seller in test env)
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 5. Soft delete the product as admin
  await api.functional.ecommerceMall.admin.admin.products.erase(
    adminConnection,
    {
      productId: product.id,
    },
  );
  // 6. Attempt to retrieve the deleted product
  await TestValidator.httpError(
    "deleted product returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.admin.products.at(
        adminConnection,
        {
          productId: product.id,
        },
      );
    },
  );
}
