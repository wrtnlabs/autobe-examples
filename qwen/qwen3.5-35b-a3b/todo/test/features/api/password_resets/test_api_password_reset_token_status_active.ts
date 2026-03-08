import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_password_resets_request_reset } from "../../../generate/generate_random_todo_app_member_password_resets_request_reset";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

export async function test_api_password_reset_token_status_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: typia.random<ITodoAppMember.IJoin>(),
    },
  );
  typia.assert(auth);
  // 2. Request password reset token
  const memberConnectionWithToken: api.IConnection = { host: connection.host };
  memberConnectionWithToken.headers = {
    ...memberConnectionWithToken.headers,
    Authorization: auth.token.access,
  };
  const passwordReset: ITodoAppMemberPasswordReset.ICreated =
    await generate_random_todo_app_member_password_resets_request_reset(
      memberConnectionWithToken,
      {
        body: {
          email: auth.email,
        },
      },
    );
  typia.assert(passwordReset);
  // 3. Retrieve password reset token status
  const tokenStatus: ITodoAppMemberPasswordReset.IStatus =
    await api.functional.todoApp.member.password_resets.at(
      memberConnectionWithToken,
      {
        resetId: passwordReset.id,
      },
    );
  typia.assert(tokenStatus);
  // 4. Validate response
  TestValidator.equals("token ID matches", tokenStatus.id, passwordReset.id);
  TestValidator.equals(
    "created_at matches",
    tokenStatus.created_at,
    passwordReset.created_at,
  );
  TestValidator.equals("isActive is true", tokenStatus.isActive, true);
  // 5. Verify expires_at is in the future (token is valid)
  const createdTime = new Date(tokenStatus.created_at).getTime();
  const expiresTime = new Date(tokenStatus.expires_at).getTime();
  const nowTime = Date.now();
  TestValidator.predicate(
    "expires_at is in the future",
    () => expiresTime > nowTime,
  );
  TestValidator.predicate(
    "expires_at is after created_at",
    () => expiresTime > createdTime,
  );
  // 6. Verify token value is NOT exposed (not in response)
  const statusKeys = Object.keys(tokenStatus);
  const hasTokenValue = statusKeys.some((key) =>
    key.toLowerCase().includes("token"),
  );
  TestValidator.predicate("token value not exposed", () => !hasTokenValue);
}
