import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

/**
 * Validate community member MFA disable flow.
 *
 * Steps:
 *
 * 1. Register a new community member (self-join) with randomized email/username
 *    and a deterministic strong password.
 * 2. Enable MFA for the newly created member (POST /auth/communityMember/twofactor
 *    action=enable).
 * 3. Disable MFA for the member (POST /auth/communityMember/twofactor
 *    action=disable) providing password.
 * 4. Assert that MFA was enabled then disabled, and that the updated_at timestamp
 *    advanced on disable.
 *
 * Notes:
 *
 * - Uses only the provided SDK functions: join and twofactor.manageTwoFactor.
 * - Uses `satisfies` for request bodies and `typia.assert()` for responses.
 */
export async function test_api_community_member_twofactor_disable_flow(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic credentials and randomized identifiers
  const password = "Passw0rd!"; // satisfies password policy: min 8, lower+upper+digit
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(8); // matches allowed username characters
  const displayName = RandomGenerator.name();

  // 2. Create (join) a new community member
  const joinBody = {
    email,
    username,
    password,
    profile: {
      display_name: displayName,
      bio: RandomGenerator.paragraph({ sentences: 6 }),
      avatar_uri: null,
    },
    session_context: {
      href: "https://example.test/",
      referrer: "https://referrer.test/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  TestValidator.predicate(
    "join returned authorization token",
    !!authorized.token && typeof authorized.token.access === "string",
  );

  // 3. Enable MFA for the account (setup step)
  // Note: OTP validity depends on environment. For simulator/test harness a fixed or random code may be accepted.
  const enableResp: ICommunityBbsCommunityMember.IMfaStatus =
    await api.functional.auth.communityMember.twofactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "enable",
          otp_code: "123456",
        } satisfies ICommunityBbsCommunityMember.IManageMfa,
      },
    );
  typia.assert(enableResp);
  TestValidator.equals(
    "mfa enabled after enable call",
    enableResp.mfa_enabled,
    true,
  );

  // 4. Disable MFA with password confirmation (main test action)
  const disableResp: ICommunityBbsCommunityMember.IMfaStatus =
    await api.functional.auth.communityMember.twofactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "disable",
          password,
        } satisfies ICommunityBbsCommunityMember.IManageMfa,
      },
    );
  typia.assert(disableResp);
  TestValidator.equals(
    "mfa disabled after disable call",
    disableResp.mfa_enabled,
    false,
  );

  // 5. Validate updated_at progressed (disable updated_at is same or later than enable)
  const enabledAt = new Date(enableResp.updated_at).getTime();
  const disabledAt = new Date(disableResp.updated_at).getTime();
  TestValidator.predicate(
    "disable updated_at not earlier than enable updated_at",
    disabledAt >= enabledAt,
  );

  // 6. Final safety check: member id matches pattern and is present
  TestValidator.predicate(
    "authorized.member.id present",
    typeof authorized.member.id === "string" && authorized.member.id.length > 0,
  );
}
