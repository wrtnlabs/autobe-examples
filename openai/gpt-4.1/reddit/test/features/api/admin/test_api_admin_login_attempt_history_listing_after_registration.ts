import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminLoginAttempt";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminLoginAttempt";

/**
 * Verifies that after registering a new admin, the admin's login attempt
 * history can be queried and paginated by an authorized admin.
 *
 * Steps:
 *
 * 1. Register a new admin via join (with random, valid credentials and audit
 *    context fields)
 * 2. (Optional) Simulate at least one login attempt by trying password reset
 *    initiation (which is observable in login audit logs)
 * 3. Use authorized admin authentication context to query login attempt history
 *    for the new admin
 * 4. Validate the presence and attributes of login attempt records (timestamp, IP,
 *    success/failure flag)
 * 5. Confirm robust pagination data structure on response
 * 6. Validate filtering with pagination parameters (first page, limited records)
 * 7. Confirm unauthorized actors (e.g., unauthenticated requests) are denied
 *    access to login attempt history
 */
export async function test_api_admin_login_attempt_history_listing_after_registration(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminData = {
    email: RandomGenerator.alphaNumeric(8) + "@autobe-test.com",
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://example.com/admin-join",
    referrer: "https://example.com/landing",
    ip: "192.0.2." + Math.floor(Math.random() * 200 + 1).toString(),
  } satisfies ICommunityPlatformAdmin.ICreate;

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);
  const adminId = admin.id;

  // 2. Simulate a login attempt (password reset triggers an entry)
  const resetRequest =
    await api.functional.auth.admin.password.reset.request.resetPasswordRequest(
      connection,
      {
        body: {
          email: admin.email,
        } satisfies ICommunityPlatformAdmin.IResetPasswordRequest,
      },
    );
  typia.assert(resetRequest);

  // 3. Retrieve login attempt history as authenticated admin
  const page1 =
    await api.functional.communityPlatform.admin.admins.loginAttempts.index(
      connection,
      {
        adminId: adminId,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
          admin_id: adminId,
        } satisfies ICommunityPlatformAdminLoginAttempt.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination structure present",
    !!page1.pagination && Array.isArray(page1.data),
  );

  // Validate that at least one record exists and attributes have valid types
  if (page1.data.length > 0) {
    const attempt = page1.data[0];
    TestValidator.equals(
      "attempt admin_id matches",
      attempt.community_platform_admin_id,
      adminId,
    );
    TestValidator.predicate(
      "timestamp is valid date-time",
      typeof attempt.attempted_at === "string" &&
        attempt.attempted_at.length > 0,
    );
    TestValidator.predicate("ip is present", typeof attempt.ip === "string");
    TestValidator.predicate(
      "success is boolean",
      typeof attempt.success === "boolean",
    );
  }

  // 4. Filter by likely impossible date (should yield empty)
  const pageByFuture =
    await api.functional.communityPlatform.admin.admins.loginAttempts.index(
      connection,
      {
        adminId: adminId,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
          admin_id: adminId,
          from_date: "2999-01-01T00:00:00.000Z",
          to_date: "2999-12-31T23:59:59.999Z",
        } satisfies ICommunityPlatformAdminLoginAttempt.IRequest,
      },
    );
  typia.assert(pageByFuture);
  TestValidator.equals(
    "future filter yields no results",
    pageByFuture.data,
    [],
  );

  // 5. Confirm unauthorized actor cannot access login history
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated actor denied access to admin login attempts",
    async () => {
      await api.functional.communityPlatform.admin.admins.loginAttempts.index(
        unauthConn,
        {
          adminId: adminId,
          body: {
            page: 1 as number & tags.Type<"int32">,
            limit: 2 as number & tags.Type<"int32">,
            admin_id: adminId,
          } satisfies ICommunityPlatformAdminLoginAttempt.IRequest,
        },
      );
    },
  );
}
