import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPasswordResetToken";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_password_reset_token_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account to establish authentication context
  // This satisfies the dependency requirement for member actor authorization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: "https://example.com/reset",
      referrer: "https://example.com",
    } satisfies ITodoAppMember.IJoin,
  });
  // Step 2: Generate a random token to simulate an expired password reset token
  // Since we cannot create a real reset token via available APIs, we use a random UUID
  // which the system will treat as expired or invalid
  const expiredToken = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to verify the expired token and expect an error
  // The endpoint should reject expired/invalid tokens to prevent account compromise
  await TestValidator.error(
    "expired token verification should fail with error",
    async () => {
      await api.functional.todoApp.member.auth.members.password.reset.verify(
        connection,
        {
          body: {
            token: expiredToken,
          } satisfies ITodoAppPasswordResetToken.IVerify,
        },
      );
    },
  );
}
