import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";

/**
 * Test that an authenticated administrator can retrieve a paginated listing of
 * their own session records.
 *
 * 1. Register a new administrator (obtain adminId and tokens)
 * 2. List admin's session records with pagination and sorting parameters
 * 3. Validate that all sessions belong to the authenticated admin, validate
 *    pagination fields, and session metadata integrity
 */
export async function test_api_admin_sessions_paginated_listing(
  connection: api.IConnection,
) {
  // 1. Register a new administrator and obtain identity plus tokens
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "Aa@1234",
    ip: "192.0.2.1",
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;

  // 2. Fetch session list - page 1, limit 10, sort by created_at desc
  const sessionList =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      connection,
      {
        adminId: adminId,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(sessionList);

  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata - page >= 0",
    sessionList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination metadata - limit >= 0",
    sessionList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination metadata - records >= 0",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination metadata - pages >= 0",
    sessionList.pagination.pages >= 0,
  );

  // 4. Validate all session records belong to the authenticated admin
  for (const session of sessionList.data) {
    typia.assert(session);
    TestValidator.equals(
      "session.admin.id matches authenticated admin",
      session.admin.id,
      adminId,
    );
    TestValidator.predicate(
      "session ip not empty",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session href not empty",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer not empty",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session created_at is ISO date-time",
      typeof session.created_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
    );
  }
}
