import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import type { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test retrieving a subcategory and verifying its parent relationship is correctly populated.
 * First authenticate as admin and create a parent category, then create a subcategory with the parentId set.
 * Retrieve the subcategory by ID and verify:
 * 1) Response contains complete subcategory details
 * 2) parent field contains the parent category's summary (id and name)
 * 3) subcategories array is empty (since subcategories cannot have further children)
 * 4) The parentId correctly references the parent category
 * This validates the upward hierarchical navigation for customers browsing subcategories.
 */
export async function test_api_category_subcategory_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory with parentId set
  const subcategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve subcategory by ID (customer/public access)
  const customerConnection: api.IConnection = { host: connection.host };
  const retrievedSubcategory = await api.functional.ecommerceMall.categories.at(
    customerConnection,
    {
      categoryId: subcategory.id,
    },
  );
  typia.assert(retrievedSubcategory);
  // 5. Verify subcategory details
  TestValidator.equals(
    "subcategory id matches",
    retrievedSubcategory.id,
    subcategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    retrievedSubcategory.name,
    subcategory.name,
  );
  TestValidator.equals(
    "subcategory parentId matches",
    retrievedSubcategory.parentId,
    parentCategory.id,
  );
  // 6. Verify parent field contains parent category summary
  typia.assert(retrievedSubcategory.parent !== null);
  const parent = retrievedSubcategory.parent!;
  TestValidator.equals(
    "parent id matches",
    parent.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    parent.name,
    parentCategory.name,
  );
  // 7. Verify subcategories array is empty (leaf categories cannot have children)
  TestValidator.predicate(
    "subcategories array is empty",
    retrievedSubcategory.subcategories.length === 0,
  );
}