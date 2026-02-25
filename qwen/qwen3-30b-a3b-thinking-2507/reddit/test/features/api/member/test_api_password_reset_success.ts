import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAccount = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Request password reset for the member
  const passwordResetResponse =
    await api.functional.reddit.member.password_resets.requestReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditMemberPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResetResponse);
  // 3. Verify password reset success
  TestValidator.equals(
    "Password reset success",
    passwordResetResponse.success,
    true,
  );
  TestValidator.equals(
    "Success message matches",
    passwordResetResponse.message,
    "Password reset email has been sent to your inbox.",
  );
}
