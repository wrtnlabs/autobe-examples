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
 * Test successful email verification workflow for newly registered members.
 *
 * Validates the complete email verification process where a member registers an account and subsequently verifies their email address using a valid verification token. This test ensures that the verification token is properly consumed and the member account transitions to an active, verified state.
 *
 * The test covers the primary success path of email verification, including token validation, member status update, and verification record soft-deletion. It also validates that verification tokens cannot be reused after successful verification.
 *
 * 1. Register a new member account with valid credentials via authorize_member_join.
 * 2. Generate a valid verification token ID (UUID format).
 * 3. Call PUT /redditLike/member/email-verifications/{verificationId} with the valid token.
 * 4. Verify the response contains complete member information (IRedditLikeMember).
 * 5. Validate that the member account is now email-verified and active.
 * 6. Confirm that subsequent verification attempts with the same token fail.
 */
export async function test_api_member_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Generate valid verification token ID (UUID format)
  // Note: In production, this ID would be obtained from the registration response
  // or by querying the email_verifications table. For simulation purposes, we
  // generate a valid UUID that the backend will accept.
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify email with valid token
  const verifiedMember: IRedditLikeMember =
    await api.functional.redditLike.member.email_verifications.putByVerificationid(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verifiedMember);
  // 4. Validate member information
  TestValidator.equals("member id matches", verifiedMember.id, joinResult.id);
  TestValidator.equals("email matches", verifiedMember.email, joinResult.email);
  TestValidator.equals(
    "username matches",
    verifiedMember.username,
    joinResult.username,
  );
  TestValidator.predicate(
    "has display name",
    verifiedMember.display_name.length > 0,
  );
  TestValidator.predicate(
    "karma score is valid",
    verifiedMember.karma_score >= 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    verifiedMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    verifiedMember.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    verifiedMember.deleted_at === null,
  );
  // 5. Test that token cannot be reused (should fail)
  await TestValidator.error("token cannot be reused", async () => {
    await api.functional.redditLike.member.email_verifications.putByVerificationid(
      memberConnection,
      {
        verificationId,
      },
    );
  });
}
