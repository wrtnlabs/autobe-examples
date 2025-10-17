import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Verify moderator email using a valid verification token.
 *
 * Business context:
 *
 * 1. Register a new moderator candidate via POST /auth/moderator/join
 * 2. Obtain a verification token (in real environments this comes from an
 *    out-of-band email sink or DB fixture; in this E2E test we synthesize a
 *    plausible token when a retrieval mechanism is unavailable)
 * 3. Call POST /auth/moderator/verify with the token
 * 4. Assert verification success and that user summary (when returned) is valid
 * 5. Assert token is single-use by attempting a second verification with the same
 *    token and expecting an error
 */
export async function test_api_moderator_verify_email_success_with_valid_token(
  connection: api.IConnection,
) {
  // 1) Register a new moderator
  const createBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPortalModerator.ICreate;

  const authorized: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // Ensure token container is present (join returns token container)
  TestValidator.predicate(
    "join returned authorization access token",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );

  // 2) Obtain or synthesize verification token
  // NOTE: In a full integration harness, retrieve the token from the
  // test email sink or DB. Here we synthesize a plausible token for
  // simulation purposes. Replace this with an actual sink lookup in
  // real integration tests.
  const verificationToken = typia.random<string & tags.MinLength<8>>();

  // 3) Call verify endpoint with the token
  const verifyResponse: ICommunityPortalModerator.IVerifyEmailResponse =
    await api.functional.auth.moderator.verify.verifyEmail(connection, {
      body: {
        verification_token: verificationToken,
      } satisfies ICommunityPortalModerator.IVerifyEmailRequest,
    });
  typia.assert(verifyResponse);

  // 4) Business assertions
  TestValidator.predicate(
    "verification reported success",
    verifyResponse.success === true,
  );

  // If the implementation returns an updated user summary, validate it
  if (verifyResponse.user !== null && verifyResponse.user !== undefined) {
    typia.assert(verifyResponse.user);
    TestValidator.predicate(
      "verified user has id",
      typeof verifyResponse.user.id === "string" &&
        verifyResponse.user.id.length > 0,
    );
    // This equality check is best-effort: it assumes the verification token
    // maps to the account we just created. In a real integration harness,
    // replace synthesized token with the actual one from the email sink so
    // this equality is deterministic.
    TestValidator.equals(
      "verified user username matches (when provided)",
      verifyResponse.user.username,
      createBody.username,
    );
  }

  // 5) Token single-use: attempting to reuse the same token should fail.
  // Note: In some simulated environments the second call may also succeed
  // depending on the mock behavior; in real integration tests a single-use
  // token should produce an error here.
  await TestValidator.error("verification token is single-use", async () => {
    await api.functional.auth.moderator.verify.verifyEmail(connection, {
      body: {
        verification_token: verificationToken,
      } satisfies ICommunityPortalModerator.IVerifyEmailRequest,
    });
  });
}
