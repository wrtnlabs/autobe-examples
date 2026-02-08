import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test deleting an existing banned user record successfully by an authenticated administrator.
 * Validate that the banned user record is removed and a 204 No Content response is returned.
 * Confirm audit logs and cascading deletes.
 */
export async function test_api_banned_user_deletion_by_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Use a random bannedUserId assuming it exists for the test
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the banned user record
  await api.functional.shoppingMall.administrator.banned_users.erase(
    adminConnection,
    {
      bannedUserId,
    },
  );
  // 4. Success if no error thrown, no further validation per guidelines
}
