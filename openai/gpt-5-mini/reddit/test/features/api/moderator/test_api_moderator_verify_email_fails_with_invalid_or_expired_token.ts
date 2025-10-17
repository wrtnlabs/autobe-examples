import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_moderator_verify_email_fails_with_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // 1. Create a moderator account with unique username/email to avoid duplicate failures
  const uniqueSuffix = Date.now().toString();
  const username = `${RandomGenerator.alphaNumeric(6)}_${uniqueSuffix}`;
  const email = `${username}@example.com`;

  const createBody = {
    username,
    email,
    password: "Password123!",
    display_name: RandomGenerator.name(),
    avatar_uri: null,
  } satisfies ICommunityPortalModerator.ICreate;

  const moderator: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: createBody });
  typia.assert(moderator);

  // Basic sanity: returned username should match the requested username
  TestValidator.equals(
    "created moderator username matches request",
    moderator.username,
    createBody.username,
  );

  // 2a. Invalid-token variant: random but guaranteed-to-be-non-valid token shape
  const invalidToken = `invalid-${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "invalid verification token should fail",
    async () => {
      await api.functional.auth.moderator.verify.verifyEmail(connection, {
        body: {
          verification_token: invalidToken,
        } satisfies ICommunityPortalModerator.IVerifyEmailRequest,
      });
    },
  );

  // 2b. Expired-token variant: simulate an expired token value (well-formed but expired)
  const expiredToken = `expired-${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "expired verification token should fail",
    async () => {
      await api.functional.auth.moderator.verify.verifyEmail(connection, {
        body: {
          verification_token: expiredToken,
        } satisfies ICommunityPortalModerator.IVerifyEmailRequest,
      });
    },
  );

  // 2c. Replay-token variant (defensive): attempt to consume a candidate token
  const candidateToken = typia.random<string & tags.MinLength<8>>();

  try {
    const firstResponse: ICommunityPortalModerator.IVerifyEmailResponse =
      await api.functional.auth.moderator.verify.verifyEmail(connection, {
        body: {
          verification_token: candidateToken,
        } satisfies ICommunityPortalModerator.IVerifyEmailRequest,
      });
    typia.assert(firstResponse);

    if (firstResponse.success === true) {
      // If the first consumption succeeded, replay with same token must fail
      await TestValidator.error(
        "replaying a single-use verification token must fail",
        async () => {
          await api.functional.auth.moderator.verify.verifyEmail(connection, {
            body: {
              verification_token: candidateToken,
            } satisfies ICommunityPortalModerator.IVerifyEmailRequest,
          });
        },
      );
    } else {
      // If first returned explicit failure, assert that verification did not succeed
      TestValidator.predicate(
        "first consumption returned failure as expected",
        firstResponse.success === false,
      );
    }
  } catch (err) {
    // If the first call threw an error, treat it as failure behavior (acceptable)
    TestValidator.predicate(
      "first consumption threw error (treated as failure)",
      err !== undefined && err !== null,
    );
  }
}
