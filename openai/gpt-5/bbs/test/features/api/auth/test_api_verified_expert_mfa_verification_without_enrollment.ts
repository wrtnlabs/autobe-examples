import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaVerify";

/**
 * Verify-MFA before enrollment must fail for a newly joined verified expert.
 *
 * Business context:
 *
 * - MFA verification requires a previously provisioned secret, which is not set
 *   at join time. Therefore, attempting to verify immediately after join (and
 *   before enrollment) must fail, and the account must remain with
 *   mfa_enabled=false.
 *
 * Steps:
 *
 * 1. Join as verified expert with valid credentials and preferences.
 * 2. Confirm initial mfa_enabled is false.
 * 3. Attempt POST /auth/verifiedExpert/mfa/verify with a placeholder payload.
 * 4. Expect the call to throw (do not check specific HTTP status codes).
 */
export async function test_api_verified_expert_mfa_verification_without_enrollment(
  connection: api.IConnection,
) {
  // 1) Join as verified expert
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<120>
    >(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const authorized: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Initial state must be mfa_enabled=false
  TestValidator.equals(
    "mfa is disabled immediately after join",
    authorized.mfa_enabled,
    false,
  );

  // 3) Attempt to verify MFA without prior enrollment → must fail
  const verifyBody = {
    // Intentionally minimal payload; schema is `any` and we only validate failure pre-enrollment
  } satisfies IEconDiscussVerifiedExpertMfaVerify.ICreate;

  await TestValidator.error(
    "verifyMfa before enrollment must throw",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.verify.verifyMfa(
        connection,
        {
          body: verifyBody,
        },
      );
    },
  );
}
