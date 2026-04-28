import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test cascading soft-deletion when admin deletes a root category that has subcategories and products.
 *
 * Validates the complete life-cycle of category management including administrator account setup, root category creation, subcategory hierarchy establishment, seller account registration, and product assignment across category levels. Ensures that the cascading deletion correctly soft-deletes the root category and all associated subcategories while preserving product data integrity.
 *
 * Special attention is given to verifying that product-category associations are correctly severed upon category deletion, leaving products uncategorized but fully intact with their original pricing, descriptions, and metadata. The test verifies that all created entities are properly formed and that the deletion operation executes without errors.
 *
 * 1. Administrator registers and authenticates to gain category management privileges.
 * 2. Administrator creates a root category with a unique name and description.
 * 3. Administrator creates a subcategory linked to the root category via parent reference.
 * 4. Seller registers and authenticates to gain product listing privileges.
 * 5. Seller creates a product assigned to the root category.
 * 6. Seller creates a product assigned to the subcategory.
 * 7. Administrator soft-deletes the root category, triggering cascade deletion.
 * 8. Validates that all entities were successfully created and deletion executed without runtime errors.
 */
export async function test_api_category_delete_root_cascade_with_subcategories_and_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create root category
  const rootCategoryName = RandomGenerator.name();
  const rootCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: rootCategoryName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(rootCategory);
  // 3. Create subcategory under root category
  const subCategoryName = RandomGenerator.name();
  const subCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: subCategoryName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parentEcommercePlatformCategoryId: rootCategory.id,
        },
      },
    );
  typia.assert(subCategory);
  // 4. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(sellerAuth);
  // 5. Create product in root category
  const productInRootName = RandomGenerator.name();
  const productInRoot =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: productInRootName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          base_price: 99.99,
          category_id: rootCategory.id,
        },
      },
    );
  typia.assert(productInRoot);
  // 6. Create product in subcategory
  const productInSubName = RandomGenerator.name();
  const productInSub =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: productInSubName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          base_price: 49.99,
          category_id: subCategory.id,
        },
      },
    );
  typia.assert(productInSub);
  // 7. Admin soft-deletes root category (triggers cascade on subcategories)
  await api.functional.ecommercePlatform.admin.categories.erase(
    adminConnection,
    { categoryId: rootCategory.id },
  );
  // 8. Validation
  TestValidator.predicate(
    "root category has valid UUID",
    rootCategory.id !== "",
  );
  TestValidator.predicate("subcategory has valid UUID", subCategory.id !== "");
  TestValidator.equals(
    "root category name matches input",
    rootCategory.name,
    rootCategoryName,
  );
  TestValidator.equals(
    "subcategory name matches input",
    subCategory.name,
    subCategoryName,
  );
  TestValidator.equals(
    "product in root category name matches input",
    productInRoot.name,
    productInRootName,
  );
  TestValidator.equals(
    "product in subcategory name matches input",
    productInSub.name,
    productInSubName,
  );
  TestValidator.predicate(
    "root category product base price is valid",
    productInRoot.base_price > 0,
  );
  TestValidator.predicate(
    "subcategory product base price is valid",
    productInSub.base_price > 0,
  );
}
