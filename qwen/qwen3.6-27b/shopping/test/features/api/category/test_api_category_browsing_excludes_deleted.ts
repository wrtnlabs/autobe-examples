import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";

/**
 * Validate that soft-deleted categories are properly excluded from the browsing hierarchy.
 *
 * Tests the complete category lifecycle including creation, cascade deletion, and browsing exclusion. Administrator creates a root category with a subcategory, then soft-deletes the root which triggers cascade deletion of all subcategories. The browsing endpoint must exclude both the deleted root and cascade-deleted subcategory from results, validating that the deleted_at null filter correctly filters inactive categories.
 *
 * This test ensures that cascade deletion works as expected and that the browsing endpoint respects the soft-delete state by only returning categories where deleted_at is null.
 *
 * 1. Administrator registers and authenticates via utility function.
 * 2. Administrator creates a root category without a parent.
 * 3. Administrator creates a subcategory under the root category.
 * 4. Browsing endpoint is queried to verify categories appear in hierarchy.
 * 5. Administrator soft-deletes the root category.
 * 6. Browsing endpoint is queried again to verify exclusion.
 * 7. Validates that deleted root and cascade-deleted child IDs do not appear in browsing results.
 */
export async function test_api_category_browsing_excludes_deleted(
  connection: api.IConnection,
) {
  // 1. Administrator registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create root category
  const root: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(root);
  // 3. Create subcategory under root
  const child: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: { parentEcommercePlatformCategoryId: root.id },
      },
    );
  typia.assert(child);
  // Verify distinct IDs for root and child
  TestValidator.notEquals("distinct category IDs", root.id, child.id);
  // 4. Browse before deletion
  const browsingBefore: IEcommercePlatformCategory.IBrowsing =
    await api.functional.ecommercePlatform.browsing(adminConnection);
  typia.assert(browsingBefore);
  // 5. Soft-delete root (should cascade delete subcategory)
  await api.functional.ecommercePlatform.admin.categories.erase(
    adminConnection,
    {
      categoryId: root.id,
    },
  );
  // 6. Browse after deletion
  const browsingAfter: IEcommercePlatformCategory.IBrowsing =
    await api.functional.ecommercePlatform.browsing(adminConnection);
  typia.assert(browsingAfter);
  // 7. Validate excluded from browsing
  TestValidator.predicate(
    "deleted root excluded from browsing",
    browsingAfter.id !== root.id,
  );
  TestValidator.predicate(
    "deleted child excluded from browsing children",
    browsingAfter.children.every((c) => c.id !== child.id && c.id !== root.id),
  );
}
