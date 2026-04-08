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

export async function test_api_category_reject_second_level_nesting(
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
    await api.functional.mallPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  const firstChild =
    await api.functional.mallPlatform.administrator.categories.subcategories.create(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(firstChild);
  await TestValidator.httpError(
    "reject second-level nested subcategory creation",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.mallPlatform.administrator.categories.subcategories.create(
        adminConnection,
        {
          categoryId: firstChild.id,
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IMallPlatformCategory.ICreate,
        },
      );
    },
  );
}
