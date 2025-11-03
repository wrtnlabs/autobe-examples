import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_admin_sessions_index(
  connection: api.IConnection,
) {
  // 1. Register a new admin user with random data
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureP@ssw0rd",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Assign admin role to the new user
  const userRoleBody = {
    user_id: admin.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const assignedRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleBody,
    });
  typia.assert(assignedRole);

  // 3. Query sessions filtered by admin user ID with pagination
  const sessionFilterByAdmin: IShoppingMallAdminSession.IRequest = {
    shopping_mall_admin_id: admin.id,
    limit: 5,
    offset: 0,
  };

  const sessionsByAdmin: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.adminSessions.index(connection, {
      body: sessionFilterByAdmin,
    });
  typia.assert(sessionsByAdmin);
  TestValidator.predicate(
    "pagination limit is respected",
    sessionsByAdmin.pagination.limit <= sessionFilterByAdmin.limit!,
  );

  for (const session of sessionsByAdmin.data) {
    TestValidator.equals(
      "session admin id matches filter",
      session.shopping_mall_admin_id,
      admin.id,
    );
    TestValidator.predicate(
      "session id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session created_at is valid ISO timestamp",
      Boolean(Date.parse(session.created_at)),
    );
    TestValidator.predicate(
      "session ip is valid IPv4 or IPv6",
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(session.ip) ||
        /^[0-9a-f:]+$/i.test(session.ip),
    );
    TestValidator.predicate(
      "session href is non-empty string",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer is string or empty",
      typeof session.referrer === "string",
    );
  }

  // 4. Query sessions filtered by creation date range
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const toDate = now.toISOString();

  const sessionFilterByDate: IShoppingMallAdminSession.IRequest = {
    created_at_from: fromDate,
    created_at_to: toDate,
    limit: 10,
    offset: 0,
  };

  const sessionsByDate: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.adminSessions.index(connection, {
      body: sessionFilterByDate,
    });
  typia.assert(sessionsByDate);

  for (const session of sessionsByDate.data) {
    const createdAt = Date.parse(session.created_at);
    TestValidator.predicate(
      "session created_at within filter range",
      createdAt >= Date.parse(fromDate) && createdAt <= Date.parse(toDate),
    );
  }

  // 5. Query sessions filtered by expired = true
  const sessionFilterExpired: IShoppingMallAdminSession.IRequest = {
    expired: true,
    limit: 10,
    offset: 0,
  };

  const expiredSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.adminSessions.index(connection, {
      body: sessionFilterExpired,
    });
  typia.assert(expiredSessions);

  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired sessions have expired_at not null",
      session.expired_at !== null && session.expired_at !== undefined,
    );
  }

  // 6. Query sessions filtered by expired = false
  const sessionFilterActive: IShoppingMallAdminSession.IRequest = {
    expired: false,
    limit: 10,
    offset: 0,
  };

  const activeSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.adminSessions.index(connection, {
      body: sessionFilterActive,
    });
  typia.assert(activeSessions);

  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active sessions have expired_at null",
      session.expired_at === null || session.expired_at === undefined,
    );
  }
}
