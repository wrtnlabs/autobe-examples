import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentDownload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test download analytics for trend analysis and monitoring purposes.
 * Validate that administrators can use the analytics endpoint to monitor download patterns over time,
 * track file access trends, and identify popular content. Test filtering by specific time periods
 * to analyze download spikes or patterns. Verify that the analytics provide sufficient detail
 * for administrative oversight including actor type distribution, geographic patterns from IP
 * addresses, and attachment type popularity. Test the aggregation capabilities for generating
 * reports on download statistics across different dimensions.
 */
export async function test_api_admin_analytics_downloads_trend_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Basic analytics without filters
  const basicAnalytics =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  // Test 2: Filter by date range (last 7 days)
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  const dateRangeAnalytics =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          created_at_start: oneWeekAgo,
          created_at_end: now,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(dateRangeAnalytics);
  // Test 3: Filter by actor type
  const actorTypes = ["guest", "member", "admin", "super_admin"] as const;
  for (const actorType of actorTypes) {
    const actorAnalytics =
      await api.functional.discussionBoard.admin.analytics.downloads.index(
        adminConnection,
        {
          body: {
            actor_type: actorType,
          } satisfies IDiscussionBoardAttachmentDownload.IRequest,
        },
      );
    typia.assert(actorAnalytics);
  }
  // Test 4: Filter by IP address pattern
  const ipAnalytics =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(ipAnalytics);
  // Test 5: Pagination testing
  const paginatedAnalytics =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(paginatedAnalytics);
  // Test 6: Combined filters
  const combinedAnalytics =
    await api.functional.discussionBoard.admin.analytics.downloads.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          created_at_start: oneWeekAgo,
          created_at_end: now,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAttachmentDownload.IRequest,
      },
    );
  typia.assert(combinedAnalytics);
  // Validate pagination business logic (not type validation)
  TestValidator.predicate(
    "pagination current page is valid",
    paginatedAnalytics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    paginatedAnalytics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginatedAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginatedAnalytics.pagination.pages >= 0,
  );
  // Validate data integrity through business logic
  if (basicAnalytics.data.length > 0) {
    const sampleRecord = basicAnalytics.data[0];
    TestValidator.predicate(
      "record has valid UUID format",
      /^[0-9a-f-]{36}$/i.test(sampleRecord.id),
    );
    TestValidator.predicate(
      "record has valid timestamp",
      !isNaN(new Date(sampleRecord.created_at).getTime()),
    );
    TestValidator.predicate(
      "record has valid actor type",
      ["guest", "member", "admin", "super_admin"].includes(
        sampleRecord.actor_type,
      ),
    );
    TestValidator.predicate(
      "record has valid IP address format",
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(sampleRecord.ip),
    );
  }
}
