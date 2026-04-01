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

export async function test_api_category_update_parent_assignment(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const parentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const updatedCategory =
    await api.functional.mallPlatform.administrator.categories.update(
      adminConnection,
      {
        categoryId,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentCategoryId,
        } satisfies IMallPlatformCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  TestValidator.equals(
    "updated category should point to the assigned parent",
    updatedCategory.parentCategory?.id,
    parentCategoryId,
  );
  TestValidator.equals(
    "updated category should not expose deeper nesting through direct children",
    updatedCategory.subcategories.length,
    0,
  );
  if (updatedCategory.parentCategory !== null) {
    TestValidator.equals(
      "direct parent should remain top-level",
      updatedCategory.parentCategory.parentCategory,
      null,
    );
  }
}
