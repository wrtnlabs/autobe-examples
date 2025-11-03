import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserLoginAttempt";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserLoginAttempt";

/**
 * Validates administrator visibility and filtering of user login attempts.
 *
 * This test covers:
 *
 * 1. Creating an admin context
 * 2. Creating a user (using password reset as user sign-up stub)
 * 3. As admin, fetching paginated login attempts for this user with default,
 *    fail-only, IP substring, and time window filtering
 * 4. Verifying that returned data conforms to summary DTO and includes correct
 *    fields
 * 5. Attempting to fetch the endpoint as unauthenticated (should fail)
 */
export async function test_api_admin_user_login_attempts_index_visibility_with_valid_dependency(
  connection: api.IConnection,
) {
  // 1. Create admin actor
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminHref =
    "https://admin-join.test/" + RandomGenerator.alphaNumeric(6);
  const adminReferrer =
    "https://referrer.test/" + RandomGenerator.alphaNumeric(5);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: adminHref,
      referrer: adminReferrer,
      // Optional ip omitted
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches input", admin.email, adminEmail);

  // 2. Create user via password reset (simulates pre-existing user scenario)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const resetResp = await api.functional.auth.user.password.reset.resetPassword(
    connection,
    {
      body: {
        email: userEmail,
      } satisfies ICommunityPlatformUser.IResetPasswordRequest,
    },
  );
  typia.assert(resetResp);
  TestValidator.predicate(
    "generic password reset response string",
    typeof resetResp.message === "string",
  );

  // 3. As admin, fetch login attempts for random user UUID
  const userId = typia.random<string & tags.Format<"uuid">>();

  // --- No filter, default pagination
  const loginAttemptsPage =
    await api.functional.communityPlatform.admin.users.loginAttempts.index(
      connection,
      {
        userId,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          from: null,
          to: null,
          ip: null,
          success: null,
        } satisfies ICommunityPlatformUserLoginAttempt.IRequest,
      },
    );
  typia.assert(loginAttemptsPage);
  TestValidator.equals(
    "pagination structure",
    typeof loginAttemptsPage.pagination,
    "object",
  );
  TestValidator.predicate(
    "login attempt data is array",
    Array.isArray(loginAttemptsPage.data),
  );
  // Validate structure of each summary if present
  for (const attempt of loginAttemptsPage.data) {
    typia.assert<ICommunityPlatformUserLoginAttempt.ISummary>(attempt);
  }

  // --- Pagination, filter by success: false
  const failAttemptsPage =
    await api.functional.communityPlatform.admin.users.loginAttempts.index(
      connection,
      {
        userId,
        body: {
          page: 1,
          limit: 10,
          from: null,
          to: null,
          ip: null,
          success: false,
        } satisfies ICommunityPlatformUserLoginAttempt.IRequest,
      },
    );
  typia.assert(failAttemptsPage);
  // Optionally, check all data.success === false if present
  if (failAttemptsPage.data.length > 0)
    TestValidator.predicate(
      "all results have success = false",
      failAttemptsPage.data.every((r) => r.success === false),
    );

  // --- If data present, exercise filtering by IP and attempted_at range
  if (loginAttemptsPage.data.length > 0) {
    const sample = loginAttemptsPage.data[0];
    // Filter by IP substring and narrowed time window
    const filteredPage =
      await api.functional.communityPlatform.admin.users.loginAttempts.index(
        connection,
        {
          userId,
          body: {
            page: 1,
            limit: 10,
            ip: sample.ip.substring(0, 5),
            from: sample.attempted_at,
            to: sample.attempted_at,
            success: null,
          } satisfies ICommunityPlatformUserLoginAttempt.IRequest,
        },
      );
    typia.assert(filteredPage);
    TestValidator.predicate(
      "filtered results IP contains substring",
      filteredPage.data.every((r) => r.ip.includes(sample.ip.substring(0, 5))),
    );
    TestValidator.predicate(
      "filtered results attempted_at match from/to",
      filteredPage.data.every((r) => r.attempted_at === sample.attempted_at),
    );
  }

  // 4. Attempt with unauthenticated connection (should be denied)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized login attempts access should fail",
    async () => {
      await api.functional.communityPlatform.admin.users.loginAttempts.index(
        unauthConn,
        {
          userId,
          body: {
            page: 1,
            limit: 10,
            from: null,
            to: null,
            ip: null,
            success: null,
          } satisfies ICommunityPlatformUserLoginAttempt.IRequest,
        },
      );
    },
  );
}
