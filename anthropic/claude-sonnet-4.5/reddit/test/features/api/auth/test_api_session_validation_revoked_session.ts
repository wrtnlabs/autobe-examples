import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAuthMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAuthMember";
import type { IRedditLikeAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAuthSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test session validation behavior when the session has been explicitly revoked
 * through logout.
 *
 * This test validates the security mechanism that prevents token reuse after
 * logout. When a user logs out, the session is soft-deleted (deleted_at
 * timestamp is set), and subsequent validation attempts should fail even if the
 * token is cryptographically valid.
 *
 * Workflow:
 *
 * 1. Register a new member account to obtain valid access and refresh tokens
 * 2. Store the access token for later validation testing
 * 3. Perform logout operation which revokes the session (sets deleted_at)
 * 4. Attempt to validate the access token from the revoked session
 * 5. Verify that validation fails with valid: false, confirming session revocation
 *    works
 */
export async function test_api_session_validation_revoked_session(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to obtain valid tokens
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  // Step 2: Store the access token for validation testing after logout
  const accessToken = authorizedMember.token.access;
  typia.assert<string>(accessToken);

  // Step 3: Perform logout operation to revoke the session
  const logoutBody = {} satisfies IRedditLikeAuthMember.ILogout;
  await api.functional.redditLike.member.auth.member.logout(connection, {
    body: logoutBody,
  });

  // Step 4: Attempt to validate the access token from the revoked session
  const validationRequest = {
    access_token: accessToken,
  } satisfies IRedditLikeAuthSession.IValidate;

  const validationResult =
    await api.functional.redditLike.auth.session.validate(connection, {
      body: validationRequest,
    });
  typia.assert(validationResult);

  // Step 5: Verify that validation fails due to session revocation
  TestValidator.equals(
    "session validation should fail for revoked session",
    validationResult.valid,
    false,
  );
}
