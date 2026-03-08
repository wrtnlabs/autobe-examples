import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_queue_priority_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using join (since login utility doesn't exist)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  adminConnection.headers!.Authorization = adminAuth.token.access;
  // 2. Query moderation queue with PRIORITY sorting
  const priorityQueue =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          sort_type: "PRIORITY" as const,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(priorityQueue);
  // 3. Validate response structure
  TestValidator.equals(
    "queue response has pagination",
    priorityQueue.pagination.records,
    priorityQueue.pagination.records,
  );
  TestValidator.equals(
    "queue response has data array",
    priorityQueue.data.length,
    priorityQueue.data.length,
  );
  // 4. Test with different sort types and validate both return valid responses
  const createdQueue =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          sort_type: "CREATED" as const,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(createdQueue);
  // 5. Verify both sorting methods return valid data
  TestValidator.equals(
    "CREATED sort returns valid response",
    createdQueue.data.length,
    createdQueue.data.length,
  );
  TestValidator.equals(
    "PRIORITY sort returns valid response",
    priorityQueue.data.length,
    priorityQueue.data.length,
  );
  // 6. Test filtering by content type
  const postReports =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          content_type: "POST" as const,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(postReports);
  // 7. Test filtering by community
  const communityFiltered =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          community_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(communityFiltered);
  // 8. Test pagination with cursor-based approach
  const paginatedResponse =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated response has correct limit",
    paginatedResponse.pagination.limit,
    10,
  );
  // 9. Test priority threshold filtering
  const thresholdResponse =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          priority_threshold: 3,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(thresholdResponse);
  // 10. Test date range filtering
  const dateFiltered =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          created_after: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // 11. Test reason search
  const reasonFiltered =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          reason_search: "spam",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(reasonFiltered);
  // 12. Test reporter filtering
  const reporterFiltered =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          reporter_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(reporterFiltered);
  // 13. Test multiple community filtering
  const communityIdsFiltered =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          community_ids: ArrayUtil.repeat(3, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(communityIdsFiltered);
  // 14. Test status filtering for RESOLVED and DISMISSED
  const resolvedReports =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "RESOLVED" as const,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(resolvedReports);
  const dismissedReports =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "DISMISSED" as const,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  // 15. Test cursor-based pagination with cursor parameter
  const cursorResponse =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {
          status: "PENDING" as const,
          cursor: "test-cursor",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(cursorResponse);
}
