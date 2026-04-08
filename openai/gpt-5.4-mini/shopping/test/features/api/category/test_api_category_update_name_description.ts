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

export async function test_api_category_update_name_description(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedCategory =
    await api.functional.mallPlatform.administrator.categories.update(
      administratorConnection,
      {
        categoryId,
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IMallPlatformCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  TestValidator.equals(
    "category id should be preserved",
    updatedCategory.id,
    categoryId,
  );
  TestValidator.equals(
    "category name should be updated",
    updatedCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category description should be updated",
    updatedCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "parent category should remain unchanged when omitted",
    updatedCategory.parentCategoryId,
    null,
  );
}
