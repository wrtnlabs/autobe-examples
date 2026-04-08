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
 * Test that an administrator receives an error when attempting to delete
 * a product that has already been deleted.
 *
 * Validates the idempotency of product deletion and proper error handling when
 * attempting to delete an already-soft-deleted product. The test ensures that
 * the deletion endpoint correctly rejects requests for products that no longer
 * exist in the active product catalog.
 *
 * **Setup Flow:**
 * 1. Register and login as admin (required for category creation)
 * 2. Create a product category via admin API
 * 3. Register and login as seller
 * 4. Create a product listing under the category
 * 5. First deletion by admin soft-deletes the product
 *
 * **Test Execution:**
 * 1. Admin attempts to delete the same product again
 *
 * **Expected Outcome:**
 * - HTTP 400 or 404 error response
 * - Error message indicates product is already deleted or not found
 * - No additional changes to the database
 *
 * 1. Admin registration and login
 * 2. Category creation for product classification
 * 3. Seller registration and login
 * 4. Product creation by seller
 * 5. First product deletion (soft-delete) - success
 * 6. Second deletion attempt - expected to fail
 */
export async function test_api_product_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a category using admin credentials
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminLoginConnection,
      {},
    );
  // 3. Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create a product with the seller
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. First deletion - should succeed
  await api.functional.ecommerceMall.admin.admin.products.erase(
    adminLoginConnection,
    {
      productId: product.id,
    },
  );
  // 6. Second deletion attempt - should fail with error
  await TestValidator.error(
    "deleting already deleted product should fail",
    async () => {
      await api.functional.ecommerceMall.admin.admin.products.erase(
        adminLoginConnection,
        {
          productId: product.id,
        },
      );
    },
  );
}
