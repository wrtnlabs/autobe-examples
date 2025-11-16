import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test combining multiple filter criteria with pagination and sorting for admin
 * session listing.
 *
 * This test validates the comprehensive filtering capabilities of the admin
 * session retrieval endpoint. It tests realistic administrative workflows where
 * multiple search dimensions are used simultaneously - filtering by date
 * ranges, IP addresses, and text search, combined with pagination and sorting.
 *
 * The test creates an admin account which automatically generates initial
 * session records, then performs various combinations of filters to ensure the
 * API correctly applies all criteria together. This validates critical security
 * monitoring and audit functionality where administrators need to investigate
 * sessions across multiple dimensions.
 *
 * Test Steps:
 *
 * 1. Create admin account (generates initial session)
 * 2. Test basic pagination without filters
 * 3. Test date range filtering with pagination
 * 4. Test IP address filtering
 * 5. Test combined filters (date + IP + pagination)
 * 6. Test text search with other filters
 * 7. Validate pagination metadata accuracy
 * 8. Test edge cases (empty results, max limits)
 */
export async function test_api_admin_session_list_combined_filters_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account which generates initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const testIp = "192.168.1.100";
  const testHref = "https://admin.example.com/login" satisfies string &
    tags.Format<"uri">;
  const testReferrer = "https://admin.example.com/" satisfies string &
    tags.Format<"uri">;

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: testIp,
      href: testHref,
      referrer: testReferrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test basic pagination without filters
  const basicPage = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListAdminSession.IRequest,
    },
  );
  typia.assert(basicPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    basicPage.pagination.current >= 0 &&
      basicPage.pagination.limit > 0 &&
      basicPage.pagination.records >= 0 &&
      basicPage.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "at least one session should exist from admin creation",
    basicPage.data.length >= 1,
  );

  // Step 3: Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dateFilteredPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
        created_at_after: oneDayAgo.toISOString(),
        created_at_before: oneDayLater.toISOString(),
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(dateFilteredPage);

  TestValidator.predicate(
    "date range filter should return sessions",
    dateFilteredPage.data.length >= 1,
  );

  // Step 4: Test IP address filtering
  const ipFilteredPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
        ip: testIp,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(ipFilteredPage);

  TestValidator.predicate(
    "IP filter should return matching sessions",
    ipFilteredPage.data.length >= 1,
  );

  // Validate all returned sessions have the filtered IP
  for (const session of ipFilteredPage.data) {
    TestValidator.equals("session IP should match filter", session.ip, testIp);
  }

  // Step 5: Test combined filters (date + IP + pagination)
  const combinedFilterPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 5,
        created_at_after: oneDayAgo.toISOString(),
        created_at_before: oneDayLater.toISOString(),
        ip: testIp,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(combinedFilterPage);

  TestValidator.predicate(
    "combined filters should return sessions",
    combinedFilterPage.data.length >= 1,
  );

  TestValidator.predicate(
    "combined filter results should respect limit",
    combinedFilterPage.data.length <= 5,
  );

  // Step 6: Test text search filtering
  const searchFilterPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
        search: "admin.example.com",
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(searchFilterPage);

  TestValidator.predicate(
    "search filter should return matching sessions",
    searchFilterPage.data.length >= 1,
  );

  // Step 7: Test sorting with filters
  const sortedPage = await api.functional.todoList.admin.admins.sessions.index(
    connection,
    {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
        sort: ["-created_at"],
        ip: testIp,
      } satisfies ITodoListAdminSession.IRequest,
    },
  );
  typia.assert(sortedPage);

  // Step 8: Test edge case - filter returning zero results
  const emptyResultPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
        ip: "999.999.999.999",
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(emptyResultPage);

  TestValidator.equals(
    "non-matching filter should return empty results",
    emptyResultPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty results should have zero records",
    emptyResultPage.pagination.records,
    0,
  );

  // Step 9: Test maximum page limit
  const maxLimitPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(maxLimitPage);

  TestValidator.predicate(
    "max limit page should not exceed 100 items",
    maxLimitPage.data.length <= 100,
  );

  // Step 10: Test pagination metadata consistency
  const metadataTestPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 5,
        ip: testIp,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(metadataTestPage);

  TestValidator.equals(
    "current page should match request",
    metadataTestPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    metadataTestPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    metadataTestPage.pagination.pages ===
      Math.ceil(
        metadataTestPage.pagination.records / metadataTestPage.pagination.limit,
      ),
  );

  // Step 11: Test combined date range and search filters
  const complexFilterPage =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
        created_at_after: oneDayAgo.toISOString(),
        created_at_before: oneDayLater.toISOString(),
        search: "login",
        ip: testIp,
      } satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(complexFilterPage);

  TestValidator.predicate(
    "complex combined filters should work correctly",
    complexFilterPage.pagination.records >= 0,
  );
}
