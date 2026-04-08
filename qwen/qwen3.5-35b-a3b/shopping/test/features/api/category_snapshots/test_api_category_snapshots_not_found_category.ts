import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategoriesSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_snapshots_not_found_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: "Test Admin",
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  typia.assert(adminAuth);
  // 2. Generate a valid UUID for non-existent category
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve snapshots for non-existent category
  await TestValidator.httpError(
    "should return 404 for non-existent category",
    [404],
    async () => {
      await api.functional.ecommerceMall.administrator.categories.snapshots.index(
        adminConnection,
        {
          categoryId: nonExistentCategoryId,
          body: {},
        },
      );
    },
  );
}
