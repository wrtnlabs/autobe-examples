import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaEnroll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaEnroll";

/**
 * Re-enrollment rotates TOTP provisioning data for verified experts.
 *
 * Flow:
 *
 * 1. Join as a verified expert to obtain an authenticated session. Confirm that
 *    MFA is disabled at join time (mfa_enabled=false) and role is
 *    "verifiedExpert".
 * 2. Call MFA enroll (method: "totp") and capture returned otpauth_uri and
 *    optional provisioning_expires_at.
 * 3. Immediately call MFA enroll again (method: "totp").
 * 4. Validate rotation: otpauth_uri from the second enrollment must differ from
 *    the first. If provisioning_expires_at exists in both responses, it should
 *    also differ, reflecting a refreshed enrollment window.
 *
 * Notes:
 *
 * - SDK auto-attaches Authorization after join; no manual header manipulation.
 * - Recovery codes and verification endpoints are out of scope per available
 *   DTOs/APIs.
 */
export async function test_api_verified_expert_mfa_enrollment_reenroll_rotates_secret(
  connection: api.IConnection,
) {
  // 1) Join as verified expert (authenticated session for subsequent calls)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const me = await api.functional.auth.verifiedExpert.join(connection, {
    body: joinBody,
  });
  typia.assert(me);
  TestValidator.equals(
    "session role is verifiedExpert",
    me.role,
    "verifiedExpert",
  );
  TestValidator.equals(
    "MFA flag is disabled right after join",
    me.mfa_enabled,
    false,
  );

  // 2) First MFA enrollment (TOTP)
  const enrollBody1 = {
    method: "totp",
    device_label: `Device ${RandomGenerator.name(1)}`,
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;

  const enroll1 = await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(
    connection,
    { body: enrollBody1 },
  );
  typia.assert(enroll1);

  // 3) Immediate re-enrollment (should rotate provisioning)
  const enrollBody2 = {
    method: "totp",
    device_label: `Device ${RandomGenerator.name(1)}`,
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;

  const enroll2 = await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(
    connection,
    { body: enrollBody2 },
  );
  typia.assert(enroll2);

  // 4) Assertions: provisioning must rotate
  TestValidator.notEquals(
    "otpauth URI must rotate on re-enroll",
    enroll1.otpauth_uri,
    enroll2.otpauth_uri,
  );

  if (
    enroll1.provisioning_expires_at !== undefined &&
    enroll2.provisioning_expires_at !== undefined
  ) {
    TestValidator.notEquals(
      "provisioning expiration should refresh on re-enroll (if provided)",
      enroll1.provisioning_expires_at,
      enroll2.provisioning_expires_at,
    );
  }
}
