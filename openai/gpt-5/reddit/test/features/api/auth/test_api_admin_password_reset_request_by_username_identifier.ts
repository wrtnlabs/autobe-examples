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
 * Initiate admin password reset using username identifier (unauthenticated),
 * and verify behavior is equivalent to using email.
 *
 * Steps
 *
 * 1. Register a new admin user with unique email and username via join API.
 * 2. Create an unauthenticated connection (fresh headers) and initiate password
 *    reset using username only.
 * 3. Initiate password reset again using email only on the same unauthenticated
 *    connection.
 * 4. Validate that both responses conform to the summary schema and that the
 *    status values are equal (behavioral equivalence).
 */
export async function test_api_admin_password_reset_request_by_username_identifier(
  connection: api.IConnection,
) {
  // 1) Register a new admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `admin_${RandomGenerator.alphaNumeric(8)}`; // matches ^[A-Za-z0-9_]{3,20}$
  const password: string = `Passw0rd${RandomGenerator.alphaNumeric(4)}`; // >= 8 chars, letter+number
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const authorized: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: joinBody });
  typia.assert<ICommunityPlatformAdminUser.IAuthorized>(authorized);

  // 2) Create unauthenticated connection and reset by username
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const byUsername: ICommunityPlatformAdminUserPasswordReset.ISummary =
    await api.functional.auth.adminUser.password.reset.requestPasswordReset(
      publicConn,
      {
        body: {
          username,
        } satisfies ICommunityPlatformAdminUserPasswordResetRequest.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAdminUserPasswordReset.ISummary>(byUsername);
  TestValidator.predicate(
    "reset by username returns non-empty status",
    typeof byUsername.status === "string" && byUsername.status.length > 0,
  );

  // 3) Reset by email (equivalence check)
  const byEmail: ICommunityPlatformAdminUserPasswordReset.ISummary =
    await api.functional.auth.adminUser.password.reset.requestPasswordReset(
      publicConn,
      {
        body: {
          email,
        } satisfies ICommunityPlatformAdminUserPasswordResetRequest.ICreate,
      },
    );
  typia.assert<ICommunityPlatformAdminUserPasswordReset.ISummary>(byEmail);

  // 4) Behavioral equivalence: same status
  TestValidator.equals(
    "reset summary status should be equal between username and email flows",
    byUsername.status,
    byEmail.status,
  );
}
