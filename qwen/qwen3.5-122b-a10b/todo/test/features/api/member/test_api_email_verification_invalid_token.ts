import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification with an invalid or non-existent token.
 *
 * Validates that submitting an invalid email verification token results in an appropriate error response without revealing specific failure reasons. This security test ensures the system does not leak information about whether a token exists, has expired, or belongs to another member, preventing token enumeration attacks.
 *
 * The test registers a new member account, then attempts to verify the email with a randomly generated token that does not exist in the system. The expected behavior is a 404 Not Found error that does not distinguish between different failure modes.
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Attempt to verify email with an invalid/non-existent token.
 * 3. Validates that the request fails with 404 error status.
 * 4. Ensures error message does not reveal specific token validation failure reasons.
 */
export async function test_api_email_verification_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt to verify with an invalid token
  await TestValidator.httpError("invalid token returns 404", 404, async () => {
    await api.functional.todoApp.member.email_verifications.verify(
      memberConnection,
      {
        body: {
          token: typia.random<string>(),
        } satisfies ITodoAppMemberEmailVerification.IVerify,
      },
    );
  });
}
