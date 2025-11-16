import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformLoginAttempt";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformLoginAttempt";

export async function test_api_admin_login_attempts_security_context_with_password_reset_tokens(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;
  const adminIdentifier: string = adminAuthorized.email; // use email as login identifier

  // 2. Generate a mix of failed and successful login attempts for the same identifier
  const loginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const loginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const sourceIp = "203.0.113.10";

  // Capture start of incident window
  const windowStart = new Date();

  // 2-1. Three failed attempts with wrong password
  const failedLoginBodyBase = {
    identifier: adminIdentifier,
    password: "WrongPassword!",
    ip: sourceIp,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  await TestValidator.error(
    "first failed admin login attempt with wrong password should error",
    async () => {
      await api.functional.auth.adminUser.login(connection, {
        body: failedLoginBodyBase,
      });
    },
  );

  await TestValidator.error(
    "second failed admin login attempt with wrong password should error",
    async () => {
      await api.functional.auth.adminUser.login(connection, {
        body: failedLoginBodyBase,
      });
    },
  );

  await TestValidator.error(
    "third failed admin login attempt with wrong password should error",
    async () => {
      await api.functional.auth.adminUser.login(connection, {
        body: failedLoginBodyBase,
      });
    },
  );

  // 2-2. One successful login attempt with correct password
  const successLoginBody = {
    identifier: adminIdentifier,
    password: joinBody.password,
    ip: sourceIp,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const loginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: successLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(loginAuthorized);

  // Capture end of incident window right after successful login
  const windowEnd = new Date();

  // 3. Issue a password reset token for the same admin account
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour later

  const resetTokenBody = {
    account_type: "admin",
    account_id: adminId,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: expiresAt,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const resetToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: resetTokenBody,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(resetToken);

  // 4. Query login attempts with identifier and time window filters
  const pageSize: number & tags.Type<"int32"> & tags.Minimum<1> = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const loginAttemptsRequest = {
    identifier: adminIdentifier,
    was_successful: null,
    source_ip: null,
    user_agent: null,
    occurred_from: windowStart.toISOString(),
    occurred_to: windowEnd.toISOString(),
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: pageSize,
    sort_by: "occurred_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformLoginAttempt.IRequest;

  const loginAttemptsPage: IPageICommunityPlatformLoginAttempt.ISummary =
    await api.functional.communityPlatform.adminUser.loginAttempts.index(
      connection,
      {
        body: loginAttemptsRequest,
      },
    );
  typia.assert<IPageICommunityPlatformLoginAttempt.ISummary>(loginAttemptsPage);

  const pagination: IPage.IPagination = loginAttemptsPage.pagination;
  const attempts: ICommunityPlatformLoginAttempt.ISummary[] =
    loginAttemptsPage.data;

  // Filter to attempts strictly for this identifier in the time window
  const filtered = attempts.filter((a) => a.identifier === adminIdentifier);

  // 5-1. Ensure at least 4 attempts recorded for this identifier
  await TestValidator.predicate(
    "at least four login attempts for the admin identifier in the time window",
    async () => filtered.length >= 4,
  );

  // 5-2. Ensure at least one failed and one successful attempt
  await TestValidator.predicate(
    "contains at least one failed login attempt for the admin identifier",
    async () => filtered.some((a) => a.was_successful === false),
  );

  await TestValidator.predicate(
    "contains at least one successful login attempt for the admin identifier",
    async () => filtered.some((a) => a.was_successful === true),
  );

  // 5-3. Pagination sanity checks
  TestValidator.predicate(
    "pagination current page should be 1",
    pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should equal requested page_size",
    pagination.limit === pageSize,
  );

  TestValidator.predicate(
    "pagination records should be greater than or equal to returned data length",
    pagination.records >= attempts.length,
  );

  TestValidator.predicate(
    "pagination pages should be at least 1",
    pagination.pages >= 1,
  );

  // 5-4. Verify occurred_at is sorted in descending order
  TestValidator.predicate(
    "login attempts should be sorted by occurred_at in descending order",
    attempts.every((attempt, index) => {
      if (index === 0) return true;
      const prev = attempts[index - 1];
      return prev.occurred_at >= attempt.occurred_at;
    }),
  );
}
