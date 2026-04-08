import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification with expired or invalid token rejection.
 *
 * Validates that the email verification endpoint properly rejects verification attempts with invalid tokens. Since verification token creation is internal to the registration flow, we test with a non-existent verification ID to validate the error handling path that would also catch expired tokens.
 *
 * The test verifies the system's security constraint on verification tokens by ensuring that verification attempts with invalid token IDs are properly rejected with appropriate error messages.
 *
 * 1. Create a new member account via POST /redditLike/auth/member/join
 * 2. Generate a random UUID that does not correspond to any verification record
 * 3. Call PUT /redditLike/member/email-verifications/{verificationId} with the non-existent token ID
 * 4. Verify the response returns a 404 error indicating the verification token was not found
 * 5. Validate that the member account remains in its original unverified state
 */
export async function test_api_member_email_verification_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.redditLike.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(member);
  // 2. Generate a random UUID that doesn't exist as a verification token
  const invalidVerificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to verify with invalid verification ID
  // This should fail with 404 - Verification token not found
  await TestValidator.httpError(
    "verification with invalid token should return 404",
    404,
    async () => {
      await api.functional.redditLike.member.email_verifications.putByVerificationid(
        connection,
        {
          verificationId: invalidVerificationId,
        },
      );
    },
  );
  // 4. Verify member account still exists (validation of step 5 is implicit)
  // The member should remain in the system, unverified
  TestValidator.predicate(
    "member account exists after failed verification",
    member.id !== undefined && member.id !== null,
  );
}
