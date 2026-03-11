import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the validation of an expired password reset token.
 *
 * This test validates that expired password reset tokens cannot be used for
 * password recovery. However, since the API does not provide endpoints for
 * creating password reset tokens, this test focuses on error handling for
 * invalid token validation attempts.
 */
export async function test_api_password_reset_token_validation_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // Attempt to validate a non-existent token to demonstrate error handling
  // Note: The API does not provide endpoints for creating password reset tokens,
  // so we cannot test actual token expiration scenarios
  const invalidToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "invalid token validation should fail",
    async () => {
      await api.functional.multiUserTodo.member.members.password_resets.at(
        memberConnection,
        { resetTokenId: invalidToken },
      );
    },
  );
}
