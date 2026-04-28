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

export async function test_api_category_browsing_hierarchy_with_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create first root category (older)
  const olderRootCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic products and devices",
          parentEcommercePlatformCategoryId: null,
        },
      },
    );
  typia.assert(olderRootCategory);
  // 3. Create second root category (newer) - created after older, so should appear first in browsing
  const newerRootCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Clothing",
          description: "Clothing and apparel items",
          parentEcommercePlatformCategoryId: null,
        },
      },
    );
  typia.assert(newerRootCategory);
  // 4. Create subcategory under second root category
  const subcategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Shirts",
          description: "Various types of shirts",
          parentEcommercePlatformCategoryId: newerRootCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 5. Call browsing endpoint to retrieve category hierarchy
  // The SDK type declares IBrowsing (singular) but the endpoint returns a hierarchical array
  // We accept the response and use it based on the actual runtime structure
  const browsingConnection: api.IConnection = { host: connection.host };
  const rawResponse =
    await api.functional.ecommercePlatform.browsing(browsingConnection);
  typia.assert(rawResponse);
  // The browsing endpoint returns all root categories as an array, ordered by created_at DESC
  const categories = rawResponse as unknown as IEcommercePlatformCategory.IBrowsing[];
  // 6. Validate we have at least two root category nodes
  TestValidator.predicate(
    "has at least two root categories",
    categories.length >= 2,
  );
  // 7. Validate root categories are ordered by created_at descending (newer first)
  // Find indices of our created categories
  const clothingIndex = categories.findIndex(
    (c) => c.id === newerRootCategory.id,
  );
  const electronicsIndex = categories.findIndex(
    (c) => c.id === olderRootCategory.id,
  );
  TestValidator.equals("Clothing (newer) index", clothingIndex, 0);
  TestValidator.equals("Electronics (older) index", electronicsIndex, 1);
  // 8. Validate the Clothing category has one child (Shirts subcategory)
  const clothingNode = categories.find((c) => c.id === newerRootCategory.id)!;
  typia.assertGuard(clothingNode);
  TestValidator.predicate(
    "Clothing has one child category",
    clothingNode.children.length === 1,
  );
  // 9. Validate subcategory is correctly nested with matching ID and name
  TestValidator.equals(
    "subcategory ID matches created subcategory",
    clothingNode.children[0].id,
    subcategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    clothingNode.children[0].name,
    subcategory.name,
  );
  // 10. Validate subcategory has no children (empty array - max two levels)
  TestValidator.equals(
    "subcategory has no children",
    clothingNode.children[0].children.length,
    0,
  );
}