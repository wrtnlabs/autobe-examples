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
import { generate_random_mall_platform_administrator_categories_subcategories_create } from "../../../generate/generate_random_mall_platform_administrator_categories_subcategories_create";
import { prepare_random_mall_platform_category } from "../../../prepare/prepare_random_mall_platform_category";

export async function test_api_category_create_subcategory_hierarchy_restriction(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const parentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const firstChild =
    await generate_random_mall_platform_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: {
          parentCategoryId,
        },
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCategory.ICreate,
      },
    );
  typia.assert(firstChild);
  TestValidator.equals(
    "created subcategory is attached to the requested parent",
    firstChild.parentCategory?.id,
    parentCategoryId,
  );
  await TestValidator.error(
    "creating a deeper nested subcategory should be rejected",
    async () => {
      await generate_random_mall_platform_administrator_categories_subcategories_create(
        adminConnection,
        {
          params: {
            parentCategoryId: firstChild.id,
          },
          body: {
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMallPlatformCategory.ICreate,
        },
      );
    },
  );
}
