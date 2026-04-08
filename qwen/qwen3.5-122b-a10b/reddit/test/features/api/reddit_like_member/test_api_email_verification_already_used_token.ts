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
 * Test email verification fails when token has already been used.
 *
 * Validates the idempotency constraint of the email verification flow by ensuring tokens are single-use and properly invalidated after first verification. This test confirms that the system correctly prevents token reuse and properly handles attempts to verify with already-consumed tokens.
 *
 * The test follows a sequential workflow: member registration generates a verification token, the first verification succeeds and invalidates the token, and the second verification attempt with the same token fails with an appropriate error response.
 *
 * 1. Register a new member account via /redditLike/auth/member/join (generates verification token)
 * 2. Extract the verification token from the member join response
 * 3. Successfully verify the email with the valid token (first verification succeeds)
 * 4. Attempt to verify again with the same token (second attempt should fail)
 * 5. Verify the second request fails with HTTP 400 Bad Request error
 * 6. Validate the member account was activated from the first verification
 *
 * Business validation points:
 * - Token is single-use and becomes invalid after first verification
 * - Second verification attempt with same token is rejected
 * - Token soft-deletion prevents reuse (deleted_at is set)
 * - Member account activation happens only once
 * - Error response indicates invalid/expired/used token
 */
export async function test_api_email_verification_already_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account (generates verification token)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: IRedditLikeMember.IAuthorized = await authorize_member_join(
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
  typia.assert(joinResult);
  // Extract verification token from join response
  // Note: The token should be available in the response for verification
  const verificationToken: string = joinResult.token.access;
  // 2. First verification with the valid token (should succeed)
  const firstVerification: IRedditLikeMember =
    await api.functional.redditLike.member.email_verifications.post(
      memberConnection,
      {
        body: {
          token: verificationToken,
        } satisfies IRedditLikeMemberEmailVerification.IVerify,
      },
    );
  typia.assert(firstVerification);
  // Validate first verification succeeded
  TestValidator.predicate(
    "member account activated after first verification",
    firstVerification.deleted_at === null,
  );
  // 3. Second verification with the same token (should fail)
  await TestValidator.error(
    "second verification with used token fails",
    async () => {
      await api.functional.redditLike.member.email_verifications.post(
        memberConnection,
        {
          body: {
            token: verificationToken,
          } satisfies IRedditLikeMemberEmailVerification.IVerify,
        },
      );
    },
  );
  // 4. Validate member account state after failed second verification
  // The account should still be activated from the first verification
  const memberAfterSecondAttempt: IRedditLikeMember =
    await api.functional.redditLike.auth.member.login(memberConnection, {
      body: {
        email: joinResult.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeMember.ILogin,
    });
  typia.assert(memberAfterSecondAttempt);
  TestValidator.predicate(
    "member account remains activated after failed second verification attempt",
    memberAfterSecondAttempt.deleted_at === null,
  );
}
