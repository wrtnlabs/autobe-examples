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

export async function test_api_category_create_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const categoryName: string = `category-${RandomGenerator.alphaNumeric(12)}`;
  const categoryDescription: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const firstCategory: IMallPlatformCategory =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "created category name",
    firstCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "created category description",
    firstCategory.description,
    categoryDescription,
  );
  TestValidator.equals("category is active", firstCategory.deleted_at, null);
  await TestValidator.error(
    "duplicate category name should be rejected",
    async () => {
      await api.functional.mallPlatform.administrator.categories.create(
        adminConnection,
        {
          body: {
            name: categoryName,
            description: `${categoryDescription} duplicate`,
          } satisfies IMallPlatformCategory.ICreate,
        },
      );
    },
  );
}
