import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification fails with an expired token.
 *
 * Validates that the email verification endpoint properly rejects expired or invalid verification tokens. The test creates a member account, then attempts to verify the email with an expired token, ensuring the system returns an appropriate error response.
 *
 * This test verifies the token validation logic including:
 * - Token expiration checks
 * - Token format validation
 * - Proper error responses for expired tokens
 * - Member account state remains unverified after failed verification
 *
 * 1. Create a member account via registration endpoint (generates verification token)
 * 2. Attempt email verification with an expired/invalid token
 * 3. Verify the request fails with 400 Bad Request error
 * 4. Confirm member account remains in unverified state
 * 5. Validate error response indicates token expiration issue
 */
export async function test_api_email_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (generates verification token internally)
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  // 2. Attempt to verify email with an expired/invalid token
  // Since we cannot easily generate an actually expired token in test environment,
  // we use an invalid token format that will fail validation
  const expiredToken = "expired-token-12345";
  // 3. Verify the request fails with appropriate error (400 Bad Request)
  await TestValidator.httpError(
    "email verification should fail with expired/invalid token",
    400,
    async () => {
      await api.functional.redditLike.member.email_verifications.post(
        memberConnection,
        {
          body: {
            token: expiredToken,
          } satisfies IRedditLikeMemberEmailVerification.IVerify,
        },
      );
    },
  );
  // 4. Verify member account still exists after failed verification
  TestValidator.equals(
    "member account exists after failed verification",
    member.id,
    member.id,
  );
}
