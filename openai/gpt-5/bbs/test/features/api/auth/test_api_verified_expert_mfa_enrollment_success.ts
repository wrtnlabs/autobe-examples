import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaEnroll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaEnroll";

export async function test_api_verified_expert_mfa_enrollment_success(
  connection: api.IConnection,
) {
  /**
   * Validate that a verified expert can initiate MFA (TOTP) enrollment
   * successfully.
   *
   * Steps
   *
   * 1. Join as a verified expert and get an authenticated session (SDK injects
   *    bearer token).
   * 2. Call enroll (method: "totp") to receive provisioning data.
   * 3. Validate response types and key business invariants (otpauth URI scheme).
   *
   * Notes
   *
   * - We DO NOT manipulate connection.headers; the SDK manages Authorization
   *   after join.
   * - Mfa_enabled remains false until separate verification (cannot be validated
   *   here due to API scope).
   */

  // 1) Join as verified expert (fresh identity)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const auth: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // Basic business validations at join time
  TestValidator.equals("role is verifiedExpert", auth.role, "verifiedExpert");
  TestValidator.equals(
    "MFA initially disabled at join",
    auth.mfa_enabled,
    false,
  );

  // 2) Initiate MFA enrollment (TOTP)
  const enrollBody = {
    method: "totp",
    device_label: "Personal Phone",
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;

  const enroll = await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(
    connection,
    { body: enrollBody },
  );
  typia.assert(enroll);

  // 3) Business rule: provisioning URI should be otpauth scheme
  TestValidator.predicate(
    "enrollment otpauth_uri starts with 'otpauth://'",
    () => enroll.otpauth_uri.startsWith("otpauth://"),
  );
}
