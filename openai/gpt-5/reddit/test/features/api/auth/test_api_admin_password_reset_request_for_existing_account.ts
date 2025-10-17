import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordReset";
import type { ICommunityPlatformAdminUserPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordResetRequest";

/**
 * Initiate admin password reset for an existing account (unauthenticated).
 *
 * This scenario provisions a real admin account first, then initiates the
 * password reset flow by identifying the account using its email. The reset
 * endpoint must be callable without Authorization headers. The test validates
 * that a type-safe summary is returned and performs a second call to confirm
 * idempotent behavior (without asserting backend-specific state).
 *
 * Steps
 *
 * 1. Create an admin account via /auth/adminUser/join with compliant fields
 * 2. Build an unauthenticated connection (headers: {})
 * 3. POST /auth/adminUser/password/reset with the admin's email
 * 4. Validate response DTO and business sanity (non-empty status)
 * 5. Call reset again to ensure it remains successful (idempotency sanity)
 */
export async function test_api_admin_password_reset_request_for_existing_account(
  connection: api.IConnection,
) {
  // 1) Provision an admin account
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `admin_${RandomGenerator.alphaNumeric(8)}`; // ^[A-Za-z0-9_]{3,20}$
  const password: string = `A1${RandomGenerator.alphaNumeric(8)}`; // ensure >=1 letter and >=1 digit
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const optIn: boolean = Math.random() < 0.5;
  const joinBodyBase = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
  } as const;
  const joinBody = (
    optIn
      ? {
          ...joinBodyBase,
          marketing_opt_in: true,
          marketing_opt_in_at: new Date().toISOString(),
        }
      : {
          ...joinBodyBase,
        }
  ) satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2) Build an unauthenticated connection per SDK rules
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Request password reset using email
  const resetBody = {
    email,
  } satisfies ICommunityPlatformAdminUserPasswordResetRequest.ICreate;
  const summary1: ICommunityPlatformAdminUserPasswordReset.ISummary =
    await api.functional.auth.adminUser.password.reset.requestPasswordReset(
      unauthConn,
      { body: resetBody },
    );
  typia.assert(summary1);
  TestValidator.predicate(
    "first password reset status must be a non-empty string",
    summary1.status.length > 0,
  );

  // 4) Idempotency sanity check - a second call should also succeed
  const summary2: ICommunityPlatformAdminUserPasswordReset.ISummary =
    await api.functional.auth.adminUser.password.reset.requestPasswordReset(
      unauthConn,
      { body: resetBody },
    );
  typia.assert(summary2);
  TestValidator.predicate(
    "second password reset status must be a non-empty string",
    summary2.status.length > 0,
  );
}
