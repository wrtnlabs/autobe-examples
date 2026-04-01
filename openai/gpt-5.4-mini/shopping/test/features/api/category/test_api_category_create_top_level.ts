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

export async function test_api_category_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const body = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformCategory.ICreate;
  const created =
    await generate_random_mall_platform_administrator_categories_create(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(created);
  TestValidator.equals("category name should persist", created.name, body.name);
  TestValidator.equals(
    "category description should persist",
    created.description,
    body.description,
  );
  TestValidator.predicate("category id should exist", created.id.length > 0);
  TestValidator.equals(
    "top-level category should not have parent",
    created.parentCategory,
    null,
  );
  TestValidator.equals(
    "top-level category should not have subcategories initially",
    created.subcategories,
    [],
  );
  TestValidator.equals(
    "category should not be deleted",
    created.deleted_at,
    null,
  );
  TestValidator.predicate(
    "category should be ready for browsing and assignment",
    created.created_at <= created.updated_at,
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "administrator-only category creation should reject unauthorized access",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.categories.create(
        unauthorizedConnection,
        {
          body,
        },
      );
    },
  );
}
