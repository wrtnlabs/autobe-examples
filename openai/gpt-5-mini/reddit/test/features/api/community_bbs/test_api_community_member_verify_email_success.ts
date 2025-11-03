import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_verify_email_success(
  connection: api.IConnection,
) {
  /**
   * Verify community member email (simulation-enabled flow).
   *
   * Purpose
   *
   * - Validate the email verification flow: register (join) → redeem token →
   *   assert post-verification state.
   *
   * Notes about simulation
   *
   * - The provided SDK materials do not include a function to read the outbox/DB
   *   or an endpoint to retrieve single-use verification tokens.
   * - To produce a fully compilable, runnable test using only available SDK
   *   functions, this test uses the SDK's simulation mode (connection.simulate
   *   = true).
   * - In a non-simulated environment the verification token MUST be captured from
   *   the test outbox/DB/email-mock and passed to the verification API.
   *
   * Steps
   *
   * 1. Register a community member using POST /auth/communityMember/join
   * 2. Construct a plausible verification token (simulation); in real setup read
   *    token from outbox/DB
   * 3. Call POST /auth/communityMember/email/verify with the token
   * 4. Assert verify response: email_verified === true, status ===
   *    'registered_verified', updated_at is a date-time
   */

  // Use a simulation-enabled connection so SDK returns mock responses.
  const simConn: api.IConnection = { ...connection, simulate: true };

  // 1) Register a new member (real tests should use unique emails per run)
  const email = `test-${RandomGenerator.alphaNumeric(6)}@example.test`;
  const username = `user_${RandomGenerator.alphaNumeric(6)}`;

  const joinBody = {
    email,
    username,
    password: "Passw0rd!",
    profile: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 4 }),
    },
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(simConn, {
      body: joinBody,
    });
  typia.assert(authorized);

  // NOTE: In production tests retrieve the single-use verification token from
  // the DB/outbox/email-mock. Here, using simulation, generate a plausible token.
  const verificationToken = typia.random<string & tags.MinLength<8>>();

  // 2) Redeem the verification token
  const verifyResponse: ICommunityBbsCommunityMember.IVerifyEmailResponse =
    await api.functional.auth.communityMember.email.verify.verifyEmail(
      simConn,
      {
        body: {
          token: verificationToken,
        } satisfies ICommunityBbsCommunityMember.IVerifyEmail,
      },
    );
  typia.assert(verifyResponse);

  // 3) Business assertions
  await TestValidator.predicate(
    "email verified flag must be true after redeeming token",
    verifyResponse.email_verified === true,
  );

  TestValidator.equals(
    "status should be 'registered_verified' after verification",
    verifyResponse.status,
    "registered_verified",
  );

  // Validate updated_at is a date-time string
  typia.assert<string & tags.Format<"date-time">>(verifyResponse.updated_at);
}
