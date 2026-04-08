import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify administrator category deletion rejects missing categories.
 *
 * This test focuses on the business-rule failure path for category removal when
 * the target category does not exist. It confirms that administrators cannot
 * delete an unavailable category and that the request fails cleanly without
 * needing any type-validation scenarios.
 *
 * 1. Authenticate as an administrator using an isolated connection.
 * 2. Attempt to delete a clearly missing category identifier.
 * 3. Assert the API rejects the operation with an HTTP error.
 */
export async function test_api_category_delete_missing_or_protected_category(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password:
        "Password1234!" satisfies IMallPlatformAdministrator.IJoin["password"],
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "delete missing category should fail",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.mallPlatform.administrator.categories.erase(
        adminConnection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
