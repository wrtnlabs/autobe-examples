import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication for authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Generate a random UUID as password reset ID to delete
  // No API to create or retrieve password reset record, so we test idempotent erase
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the password reset record
  await api.functional.communityPlatform.user.password_resets.erase(
    userConnection,
    {
      id: passwordResetId,
    },
  );
  // 4. Delete again to test idempotency (should not throw)
  await api.functional.communityPlatform.user.password_resets.erase(
    userConnection,
    {
      id: passwordResetId,
    },
  );
}
