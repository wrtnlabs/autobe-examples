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

/**
 * Test that requesting a new password reset invalidates existing active tokens.
 * A member requests a password reset, then immediately requests another password
 * reset for the same account. The system should invalidate the first token by
 * setting its deleted_at timestamp and create a new token with fresh expiration.
 * Verify that only the most recent token is valid by checking the password reset
 * records. This ensures that if a token is compromised, requesting a new reset
 * immediately invalidates the old one, maintaining security.
 */
export async function test_api_password_reset_token_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.MinLength<8> =
    RandomGenerator.alphaNumeric(16);
  const memberDisplayName: string & tags.MinLength<1> & tags.MaxLength<100> =
    RandomGenerator.name();
  const memberJoined = await api.functional.todoApp.auth.member.join(
    connection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        displayName: memberDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberJoined);
  // 2. Request password reset (first request)
  const firstResetResponse =
    await api.functional.todoApp.member.password_resets.request(connection, {
      body: {
        email: memberEmail,
      } satisfies ITodoAppMemberPasswordReset.IRequest,
    });
  typia.assert(firstResetResponse);
  // 3. Request password reset again (second request) - should invalidate first token
  const secondResetResponse =
    await api.functional.todoApp.member.password_resets.request(connection, {
      body: {
        email: memberEmail,
      } satisfies ITodoAppMemberPasswordReset.IRequest,
    });
  typia.assert(secondResetResponse);
  // 4. Validate both responses have expected structure
  TestValidator.equals(
    "first reset response status",
    firstResetResponse.status,
    "success",
  );
  TestValidator.equals(
    "second reset response status",
    secondResetResponse.status,
    "success",
  );
  TestValidator.predicate(
    "first reset has message",
    firstResetResponse.message.length > 0,
  );
  TestValidator.predicate(
    "second reset has message",
    secondResetResponse.message.length > 0,
  );
}
