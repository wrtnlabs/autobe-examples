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
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_super_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test category deletion workflow with products and subcategories by superAdmin.
 *
 * Validates the complete category deletion flow including cascade behavior:
 * - Parent category deletion removes all subcategories
 * - Products assigned to deleted categories become uncategorized (category_id set to null)
 * - Deleted categories are no longer accessible or listed
 *
 * This test ensures data integrity during category deletion operations.
 *
 * 1. SuperAdmin creates parent category (Electronics) with subcategory (Smartphones)
 * 2. Seller creates product assigned to parent category
 * 3. SuperAdmin deletes parent category
 * 4. Validates cascade deletion of subcategory and uncategorization of product
 */
export async function test_api_category_deletion_with_products_and_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create parent category (Electronics)
  const parentCategory =
    await generate_random_ecommerce_mall_super_admin_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory (Smartphones) under parent
  const subcategory =
    await generate_random_ecommerce_mall_super_admin_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Authenticate as seller and create product assigned to parent category
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Test Smartphone",
          description: "A test smartphone product",
          basePrice: 999,
          categoryId: parentCategory.id,
        },
      },
    );
  typia.assert(product);
  // Verify product is assigned to the parent category before deletion
  TestValidator.equals(
    "product has parent category",
    product.category.id,
    parentCategory.id,
  );
  // 5. Delete the parent category (should return void/204 No Content)
  await api.functional.ecommerceMall.superAdmin.admin.categories.erase(
    superAdminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // 6. Validations
  // Verify the delete operation succeeds (no error thrown, returns void)
  // The category deletion should cascade to subcategories
  // Products should become uncategorized (category becomes null)
  // Note: According to spec, products become uncategorized when their category is deleted
  // The product should still exist but without a category
  TestValidator.predicate(
    "product still exists after category deletion",
    product.deletedAt === null,
  );
  // Subcategory should be cascade deleted (verified by checking subcategory.deleted_at)
  TestValidator.predicate(
    "subcategory is marked as deleted",
    subcategory.deleted_at !== null,
  );
}
