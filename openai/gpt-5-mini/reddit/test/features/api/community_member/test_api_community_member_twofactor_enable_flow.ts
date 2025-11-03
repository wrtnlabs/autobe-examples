import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_twofactor_enable_flow(
  connection: api.IConnection,
) {
  /**
   * Enable MFA for a freshly created community member and assert persisted
   * state plus session invalidation behavior.
   *
   * Steps:
   *
   * 1. Create member via join (capture tokens & session)
   * 2. Enable MFA via twofactor.manageTwoFactor with OTP
   * 3. Assert IMfaStatus.mfa_enabled === true
   * 4. Attempt to use the previously issued access token and assert failure
   *
   * Notes:
   *
   * - OTP generation here is syntactic (6-digit) because the provided SDK
   *   materials do not expose an enrollment/secret retrieval endpoint. In a
   *   fully integrated environment, the OTP should be derived from the
   *   enrollment secret or obtained from a test harness.
   * - The test assumes MFA enabling rotates/revokes prior sessions. If the
   *   implementation keeps sessions, adapt the test to verify session flags or
   *   audit logs instead.
   */

  // 1) Create a fresh community member via join
  const password = "Passw0rd!"; // satisfies server password policy (min 8, upper/lower/digit)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password,
    profile: {
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 4 }),
    },
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Capture previously issued access token and session id
  const previousAccessToken: string = authorized.token.access;
  const sessionId: string = authorized.session.id;

  // Basic sanity checks
  TestValidator.predicate(
    "previous access token is available",
    typeof previousAccessToken === "string" && previousAccessToken.length > 0,
  );
  TestValidator.predicate(
    "session id is available",
    typeof sessionId === "string" && sessionId.length > 0,
  );

  // 2) Enable MFA: generate a syntactically valid OTP and send enable request
  // NOTE: This OTP is synthetic for testing since OTP secret enrollment is
  // not exposed via the provided SDK functions.
  const otpCode = typia.random<string & tags.Pattern<"^[0-9]{6}$">>();

  const mfaStatus: ICommunityBbsCommunityMember.IMfaStatus =
    await api.functional.auth.communityMember.twofactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "enable",
          otp_code: otpCode,
        } satisfies ICommunityBbsCommunityMember.IManageMfa,
      },
    );
  typia.assert(mfaStatus);

  // 3) Assert MFA is enabled and updated_at present
  TestValidator.equals(
    "mfa enabled after enable call",
    mfaStatus.mfa_enabled,
    true,
  );
  TestValidator.predicate(
    "mfa updated_at is ISO string",
    typeof mfaStatus.updated_at === "string",
  );

  // 4) Validate side-effect: previous token should be invalidated / require re-auth
  // Create a cloned connection that uses the previously issued access token.
  // We avoid mutating the original connection.headers and construct a new
  // connection object for the simulated client.
  const oldConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: previousAccessToken },
  };

  await TestValidator.error(
    "previous access token should be invalid after enabling MFA",
    async () => {
      // Attempt a protected operation using the old token. Using the twofactor
      // endpoint again as a protected call; the call should fail if the token
      // was revoked/rotated during MFA enablement.
      await api.functional.auth.communityMember.twofactor.manageTwoFactor(
        oldConnection,
        {
          body: {
            action: "enable",
            otp_code: otpCode,
          } satisfies ICommunityBbsCommunityMember.IManageMfa,
        },
      );
    },
  );

  // Business-level sanity: mfaStatus reflects the correct member id
  TestValidator.equals(
    "mfa status member id matches authorized member id",
    mfaStatus.id,
    authorized.member.id,
  );
}
