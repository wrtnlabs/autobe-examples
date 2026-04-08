import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_categories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_create";
import { prepare_random_mall_platform_category } from "../../../prepare/prepare_random_mall_platform_category";

export async function test_api_category_create_direct_subcategory(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator creation of a direct subcategory under an existing top-level category.
   *
   * Validates that category creation preserves the one-level hierarchy rule while exposing the newly created subcategory through the parent category's direct children. Also confirms the parent category remains unchanged apart from the expected subcategory relationship and that the created subcategory response retains the submitted name, description, and parent reference.
   *
   * 1. Authenticate as a fresh administrator using the join utility and a dedicated connection.
   * 2. Create a top-level parent category.
   * 3. Create a direct subcategory under that parent category.
   * 4. Validate the returned category fields and one-level hierarchy shape.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const parentName = RandomGenerator.name(2);
  const parentDescription = RandomGenerator.paragraph({ sentences: 2 });
  const parentCategory =
    await api.functional.mallPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: parentName,
          description: parentDescription,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  const parentSnapshot = {
    id: parentCategory.id,
    parentCategory: parentCategory.parentCategory,
    name: parentCategory.name,
    description: parentCategory.description,
    createdAt: parentCategory.createdAt,
    updatedAt: parentCategory.updatedAt,
    deletedAt: parentCategory.deletedAt,
    subcategories: parentCategory.subcategories.map((subcategory) => ({
      id: subcategory.id,
      parentCategory: subcategory.parentCategory,
      name: subcategory.name,
      description: subcategory.description,
      created_at: subcategory.created_at,
      updated_at: subcategory.updated_at,
      deleted_at: subcategory.deleted_at,
    })),
  } satisfies IMallPlatformCategory;
  const childName = `${RandomGenerator.name(2)} child`;
  const childDescription = RandomGenerator.paragraph({ sentences: 3 });
  const childCategory =
    await api.functional.mallPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: childName,
          description: childDescription,
          parentCategoryId: parentCategory.id,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  TestValidator.equals(
    "subcategory name matches input",
    childCategory.name,
    childName,
  );
  TestValidator.equals(
    "subcategory description matches input",
    childCategory.description,
    childDescription,
  );
  TestValidator.equals(
    "subcategory parent category id matches parent",
    childCategory.parentCategory?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory parent category name matches parent",
    childCategory.parentCategory?.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "subcategory parent category description matches parent",
    childCategory.parentCategory?.description,
    parentCategory.description,
  );
  TestValidator.equals(
    "parent category remains unchanged after child creation",
    parentCategory,
    parentSnapshot,
  );
  TestValidator.predicate(
    "parent category has the created subcategory as a direct child",
    parentCategory.subcategories.some(
      (subcategory) => subcategory.id === childCategory.id,
    ),
  );
  TestValidator.predicate(
    "created subcategory does not expose deeper nesting",
    childCategory.subcategories.length === 0,
  );
  TestValidator.predicate(
    "created subcategory links only to the direct parent",
    childCategory.parentCategory !== null &&
      childCategory.parentCategory.parentCategory === null,
  );
}
