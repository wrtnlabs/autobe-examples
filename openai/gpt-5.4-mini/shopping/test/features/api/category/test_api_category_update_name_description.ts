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
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const output =
    await api.functional.mallPlatform.administrator.categories.update(
      adminConnection,
      {
        categoryId,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IMallPlatformCategory.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "category id should remain the same",
    output.id,
    categoryId,
  );
  TestValidator.equals(
    "category name should be updated",
    output.name,
    updatedName,
  );
  TestValidator.equals(
    "category description should be updated",
    output.description,
    updatedDescription,
  );
}
