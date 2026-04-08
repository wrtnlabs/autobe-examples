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

export async function test_api_category_subcategory_update_taxonomy_rule_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.error(
    "subcategory update should reject invalid taxonomy identifiers",
    async () => {
      await api.functional.mallPlatform.administrator.categories.subcategories.update(
        adminConnection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          subcategoryId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parentCategoryId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IMallPlatformCategory.IUpdate,
        },
      );
    },
  );
}
