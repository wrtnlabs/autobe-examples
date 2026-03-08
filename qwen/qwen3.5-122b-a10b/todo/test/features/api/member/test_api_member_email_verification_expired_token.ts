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
 * Test email verification with an expired token.
 *
 * A user registers but waits beyond the 24-hour expiration period before
 * attempting to verify their email. When they submit the expired verification
 * token, the system should reject the request and return an appropriate error
 * indicating the token has expired.
 *
 * Note: Since we cannot actually wait 24 hours in a test, we simulate the
 * scenario by using an invalid/expired token. The actual token value is never
 * exposed in API responses (security measure), so we use a fake token to test
 * the error handling for expired/invalid tokens.
 */
export async function test_api_member_email_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account which creates the email verification record
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt to verify email with an expired/invalid token
  // Since the actual token is never exposed in API responses (security measure),
  // we use a fake token to test that the system properly rejects invalid/expired tokens
  await TestValidator.error("expired token should be rejected", async () => {
    await api.functional.todoApp.member.email_verifications.verify(
      memberConnection,
      {
        body: {
          token: typia.random<string & tags.Format<"uuid">>(), // Fake token that doesn't exist/is expired
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  });
}
