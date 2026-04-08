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
import { generate_random_mall_platform_administrator_categories_subcategories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_subcategories_create";
import { prepare_random_mall_platform_category } from "../../../prepare/prepare_random_mall_platform_category";

export async function test_api_category_create_direct_subcategory(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const parentCategory =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  const subcategoryBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformCategory.ICreate;
  const created =
    await generate_random_mall_platform_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: subcategoryBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "subcategory name should match requested value",
    created.name,
    subcategoryBody.name,
  );
  TestValidator.equals(
    "subcategory description should match requested value",
    created.description,
    subcategoryBody.description,
  );
  TestValidator.equals(
    "subcategory parent id should match parent category id",
    created.parentCategoryId,
    parentCategory.id,
  );
  TestValidator.predicate(
    "subcategory should have a parent category reference",
    created.parentCategory !== null,
  );
  const directParent = created.parentCategory;
  TestValidator.equals(
    "subcategory parent reference id should match parent category id",
    directParent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory should not have direct children",
    created.subcategories.length,
    0,
  );
  TestValidator.predicate(
    "parent category should include the created subcategory as a direct child",
    parentCategory.subcategories.some((item) => item.id === created.id),
  );
  TestValidator.predicate(
    "created category should remain one level deep",
    directParent !== null && directParent.parentCategory === null,
  );
}
