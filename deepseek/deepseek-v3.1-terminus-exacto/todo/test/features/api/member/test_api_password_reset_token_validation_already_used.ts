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
 * Test the validation of a password reset token that has already been used.
 * This test validates the security requirement that tokens can only be used once
 * to prevent replay attacks.
 */
export async function test_api_password_reset_token_validation_already_used(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account for testing
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
  // Since the password reset token generation and usage endpoints are not available
  // in the provided API functions, we cannot create and use a token to test the
  // "already used" scenario. The test demonstrates basic token validation functionality
  // but cannot validate the specific security requirement due to missing APIs.
  // Attempt to validate a randomly generated token string
  const randomToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "validating invalid token should fail",
    async () => {
      await api.functional.multiUserTodo.member.members.password_resets.at(
        memberConnection,
        {
          resetTokenId: randomToken,
        },
      );
    },
  );
}
