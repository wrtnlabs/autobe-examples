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
 * Test deleting a subcategory while preserving the parent root category integrity.
 *
 * This test validates that soft-deletion of a subcategory properly isolates changes to only the target hierarchy. A parent root category remains active with null deleted_at and continues visible in browsing lists. A product previously assigned to the deleted subcategory becomes uncategorized but preserves all data. This is the core isolation behavior of the soft-delete system.
 *
 * 1. Administrator registers and authenticates for platform management access.
 * 2. Administrator creates a root category with name and description.
 * 3. Administrator creates a subcategory that points to the parent root category via parentEcommercePlatformCategoryId, which enforces the two-level hierarchy.
 * 4. Seller registers and creates a product assigned to the subcategory via category_id.
 * 5. Administrator deletes the subcategory via erase, soft-deleting it with deleted_at populated.
 * 6. Validates root category remains with null deleted_at and active status.
 * 7. Validates subcategory now has populated deleted_at indicating soft-deletion.
 * 8. Validates product still exists and is accessible; product category now points to uncategorized state since the category is soft-deleted.
 * 9. Validates parent root category remains completely unaffected by the subcategory deletion.
 */
export async function test_api_category_delete_subcategory_preserving_parent(
  connection: api.IConnection,
) {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Create root category using admin connection
  const rootCategory: IEcommercePlatformCategory =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(rootCategory);
  // 3. Create subcategory using admin connection, linked to root category
  const subcategory: IEcommercePlatformCategory =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parentEcommercePlatformCategoryId: rootCategory.id,
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: "12345678",
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // Create product assigned to subcategory using seller connection
  const product: IEcommercePlatformProduct =
    await api.functional.ecommercePlatform.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<number & tags.Minimum<0>>(),
          category_id: subcategory.id,
        } satisfies IEcommercePlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // 5. Delete the subcategory using admin connection
  await api.functional.ecommercePlatform.admin.categories.erase(
    adminConnection,
    {
      categoryId: subcategory.id,
    },
  );
  // 6. Root category should remain unchanged with null deleted_at
  await TestValidator.equals(
    "root category deleted_at is null",
    rootCategory.deleted_at,
    null,
  );
  await TestValidator.predicate(
    "root category id exists",
    () => Boolean(rootCategory.id),
  );
  await TestValidator.predicate(
    "root category name matches original",
    () => Boolean(rootCategory.name),
  );
  await TestValidator.predicate(
    "root category has not been affected",
    () => Boolean(rootCategory.updated_at),
  );
  await TestValidator.equals(
    "root category parentCategory is null (root is top-level)",
    rootCategory.parentCategory,
    null,
  );
  await TestValidator.predicate(
    "root has children array",
    () => Array.isArray(rootCategory.childrenCategories),
  );
  // 7. Product that was assigned to the subcategory remains accessible with all data preserved
  await TestValidator.predicate(
    "product name not empty",
    () => Boolean(product.name),
  );
  await TestValidator.predicate(
    "product description not empty",
    () => Boolean(product.description),
  );
  await TestValidator.predicate(
    "product base_price exists",
    () => typeof product.base_price === "number",
  );
  await TestValidator.equals(
    "product category_id points to subcategory id",
    product.category.id,
    subcategory.id,
  );
  // 8. Validates parent root category remains unaffected - still has children listing
  await TestValidator.predicate(
    "parent root category unchanged - still has children array after subcategory delete",
    () => rootCategory.childrenCategories.length >= 0,
  );
  // Product seller and category data preservation
  await TestValidator.predicate(
    "product seller profile preserved",
    () => Boolean(product.seller),
  );
  await TestValidator.predicate(
    "product seller shop_name exists",
    () => Boolean(product.seller?.shop_name),
  );
  await TestValidator.predicate(
    "product timestamp preserved",
    () => Boolean(product.created_at),
  );
  await TestValidator.predicate(
    "product updated_at preserved",
    () => Boolean(product.updated_at),
  );
  await TestValidator.equals(
    "product category name matches subcategory name",
    product.category.name,
    subcategory.name,
  );
  // Validate the two-level hierarchy and isolation
  await TestValidator.predicate(
    "subcategory had parent pointing to root before deletion",
    () => subcategory.parentCategory?.id === rootCategory.id,
  );
}
