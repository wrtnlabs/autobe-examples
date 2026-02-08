import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_token_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // Prepare a UUID that does not exist
  const nonExistentPasswordResetId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Attempt to retrieve the non-existing password reset token
  // Expect HTTP 404 Not Found error
  await TestValidator.httpError(
    "password reset token not found",
    404,
    async () => {
      await api.functional.communityPlatform.user.password_resets.at(
        userConnection,
        {
          passwordResetId: nonExistentPasswordResetId,
        },
      );
    },
  );
  // 3. Unauthorized access test: use base connection without authorization
  await TestValidator.httpError(
    "unauthorized password reset token retrieval",
    401,
    async () => {
      await api.functional.communityPlatform.user.password_resets.at(
        connection,
        {
          passwordResetId: nonExistentPasswordResetId,
        },
      );
    },
  );
}
