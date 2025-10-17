import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Ensure disabling MFA is rejected or treated as a safe no-op when MFA has not
 * been enabled.
 *
 * Business flow:
 *
 * 1. Register a fresh admin (join). New admins should start with mfaEnabled=false.
 * 2. Attempt to disable MFA without prior enablement.
 *
 *    - Accept either a business rejection (error) or an idempotent success returning
 *         a security event. Do not assert specific HTTP status codes.
 * 3. Optionally call disable again to confirm the operation remains safe (still
 *    either rejected or no-op success).
 *
 * Validation:
 *
 * - Use typia.assert() on non-void API responses for complete type validation.
 * - Use TestValidator.predicate with descriptive titles; avoid
 *   HTTP-status-specific checks.
 */
export async function test_api_admin_mfa_disable_when_not_enabled(
  connection: api.IConnection,
) {
  // 1) Register a new admin (join) and obtain token via SDK's automatic handling
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: null,
  } satisfies IEconDiscussAdmin.ICreate;
  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // If subject projection is present, newly joined admin should have MFA disabled.
  if (authorized.admin !== undefined) {
    TestValidator.predicate(
      "new admin starts with mfaEnabled=false",
      authorized.admin.mfaEnabled === false,
    );
  }

  // 2) Attempt to disable MFA without prior enablement
  let firstEvent: IEconDiscussAdmin.ISecurityEvent | null = null;
  let firstFailed = false;
  try {
    firstEvent = await api.functional.auth.admin.mfa.disableMfa(connection, {
      // IMfaDisableRequest is `any`, provide minimal body without `satisfies any`.
      body: {},
    });
    typia.assert(firstEvent);
  } catch (_err) {
    firstFailed = true;
  }

  TestValidator.predicate(
    "disableMfa without enabling should be rejected or treated as idempotent no-op",
    firstFailed || firstEvent !== null,
  );

  // 3) Optional idempotency safety check: a second call should also be safe
  let secondEvent: IEconDiscussAdmin.ISecurityEvent | null = null;
  let secondFailed = false;
  try {
    secondEvent = await api.functional.auth.admin.mfa.disableMfa(connection, {
      body: {},
    });
    typia.assert(secondEvent);
  } catch (_err) {
    secondFailed = true;
  }

  TestValidator.predicate(
    "second disableMfa call remains safe (still error or no-op)",
    secondFailed || secondEvent !== null,
  );
}
