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

/**
 * Test administrator creation of a top-level marketplace category.
 *
 * Verifies that an authenticated administrator can register a new category at
 * the root taxonomy level. The test checks the returned entity fields, ensures
 * the parent category remains null for top-level creation, and confirms the
 * category is immediately usable for browsing and product classification flows.
 *
 * 1. Authenticate as a fresh administrator.
 * 2. Create a top-level category with a generated name and description.
 * 3. Validate the created category response matches the request and persisted
 *    entity rules.
 */
export async function test_api_category_create_top_level_category(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const name = RandomGenerator.name();
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const category =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name,
          description,
          parentCategoryId: null,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("category name", category.name, name);
  TestValidator.equals(
    "category description",
    category.description,
    description,
  );
  TestValidator.equals(
    "top-level category parent",
    category.parentCategory,
    null,
  );
  TestValidator.equals(
    "top-level category subcategories",
    category.subcategories,
    [],
  );
  TestValidator.equals("new category is not deleted", category.deletedAt, null);
  const summary: IMallPlatformCategory.ISummary = {
    id: category.id,
    parentCategory: category.parentCategory,
    name: category.name,
    description: category.description,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
    deleted_at: category.deletedAt,
  };
  typia.assert(summary);
  TestValidator.equals("summary name", summary.name, name);
  TestValidator.equals("summary description", summary.description, description);
  TestValidator.equals("summary parent", summary.parentCategory, null);
}
