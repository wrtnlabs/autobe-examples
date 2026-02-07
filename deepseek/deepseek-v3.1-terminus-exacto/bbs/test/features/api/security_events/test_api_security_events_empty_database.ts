import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test security events endpoint behavior when no events exist in the database.
 * Validates empty data array, proper pagination metadata, and response structure
 * consistency for various filter combinations with no matching results.
 */
export async function test_api_security_events_empty_database(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Update admin connection with authorization token
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Test basic empty database query
  const basicResult =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(basicResult);
  // 3. Validate empty response structure
  await TestValidator.equals("empty data array", basicResult.data, []);
  await TestValidator.equals("zero records", basicResult.pagination.records, 0);
  await TestValidator.equals("zero pages", basicResult.pagination.pages, 0);
  await TestValidator.equals(
    "current page 1",
    basicResult.pagination.current,
    1,
  );
  await TestValidator.equals("limit matches", basicResult.pagination.limit, 10);
  // 4. Test with various filter combinations
  const filterTests = [
    {
      description: "event type filter with no events",
      body: {
        event_type: "failed_login" as const,
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
    {
      description: "severity filter with no events",
      body: {
        severity: "high" as const,
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
    {
      description: "resolved filter with no events",
      body: {
        resolved: true,
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
    {
      description: "date range filter with no events",
      body: {
        created_at_start: new Date("2020-01-01T00:00:00Z").toISOString(),
        created_at_end: new Date("2020-01-02T00:00:00Z").toISOString(),
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
    {
      description: "search query with no events",
      body: {
        search: "nonexistent search term",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
    {
      description: "combined filters with no events",
      body: {
        event_type: "suspicious_activity" as const,
        severity: "critical" as const,
        resolved: false,
        search: "impossible combination",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
  ];
  for (const test of filterTests) {
    const result =
      await api.functional.discussionBoard.admin.security_events.index(
        adminConnection,
        {
          body: test.body,
        },
      );
    typia.assert(result);
    await TestValidator.equals(
      `${test.description} - empty data`,
      result.data,
      [],
    );
    await TestValidator.equals(
      `${test.description} - zero records`,
      result.pagination.records,
      0,
    );
    await TestValidator.equals(
      `${test.description} - zero pages`,
      result.pagination.pages,
      0,
    );
  }
  // 5. Test boundary cases
  const boundaryTests = [
    {
      description: "extreme future date range",
      body: {
        created_at_start: new Date("2100-01-01T00:00:00Z").toISOString(),
        created_at_end: new Date("2100-12-31T23:59:59Z").toISOString(),
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
    {
      description: "extreme past date range",
      body: {
        created_at_start: new Date("1900-01-01T00:00:00Z").toISOString(),
        created_at_end: new Date("1900-12-31T23:59:59Z").toISOString(),
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
    {
      description: "maximum page size",
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
    {
      description: "minimum page size",
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardSecurityEvent.IRequest,
    },
  ];
  for (const test of boundaryTests) {
    const result =
      await api.functional.discussionBoard.admin.security_events.index(
        adminConnection,
        {
          body: test.body,
        },
      );
    typia.assert(result);
    await TestValidator.equals(
      `${test.description} - empty data`,
      result.data,
      [],
    );
    await TestValidator.equals(
      `${test.description} - zero records`,
      result.pagination.records,
      0,
    );
  }
  // 6. Test pagination with high page numbers
  const highPageResult =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(highPageResult);
  await TestValidator.equals("high page - empty data", highPageResult.data, []);
  await TestValidator.equals(
    "high page - zero records",
    highPageResult.pagination.records,
    0,
  );
  await TestValidator.equals(
    "high page - zero pages",
    highPageResult.pagination.pages,
    0,
  );
  await TestValidator.equals(
    "high page - current page 999",
    highPageResult.pagination.current,
    999,
  );
}
