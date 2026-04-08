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

export async function test_api_category_delete_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator category deletion succeeds and does not rely on the
   * deleted category remaining available for marketplace taxonomy browsing.
   *
   * This test covers the happy-path administrative workflow for removing a
   * category. It authenticates an administrator, deletes a category by id, and
   * confirms the deletion call completes successfully without requiring any
   * extra response-body validation.
   *
   * 1. Authenticate as an administrator using the join utility.
   * 2. Delete an existing category by UUID through the administrator category API.
   * 3. Confirm the operation completes without throwing.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.mallPlatform.administrator.categories.erase(
    administratorConnection,
    {
      categoryId,
    },
  );
}
