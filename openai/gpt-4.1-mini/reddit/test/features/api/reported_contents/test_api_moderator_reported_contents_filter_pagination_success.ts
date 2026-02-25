import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_moderator_reported_contents_filter_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup base connections
  const baseModeratorConn: api.IConnection = { host: connection.host };
  const baseUserConn: api.IConnection = { host: connection.host };
  // Create and authorize two users
  const user1 = await authorize_user_join(baseUserConn, {});
  const user1Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user1.token.access },
  };
  const user2 = await authorize_user_join(baseUserConn, {});
  const user2Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user2.token.access },
  };
  // Create and authorize a moderator
  const moderatorJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatarUrl: "https://avatar.example.com/avatar.png",
  };
  const moderator = await authorize_moderator_join(baseModeratorConn, {
    body: moderatorJoinData,
  });
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: moderator.token.access },
  };
  // Create a report by user1
  const reportCreateBody = {
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: "pending",
    communityPlatformUserId: user1.id,
    communityPlatformReportReasonId: typia.random<
      string & tags.Format<"uuid">
    >(),
  };
  // Actually create the report using user1's connection
  const report = await api.functional.communityPlatform.user.reports.create(
    user1Connection,
    {
      body: reportCreateBody,
    },
  );
  typia.assert(report);
  // Ensure unauthorized requests fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access - no auth", async () => {
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      unauthorizedConnection,
      {
        reportId: report.id,
        body: {},
      },
    );
  });
  const userOnlyConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user2.token.access },
  };
  await TestValidator.error("unauthorized access - user role", async () => {
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      userOnlyConnection,
      {
        reportId: report.id,
        body: {},
      },
    );
  });
  // Prepare filtering params
  // Test filtering by contentType
  const filterPost: ICommunityPlatformReportedContent.IRequest = {
    contentType: "post",
    page: 1,
    limit: 10,
  };
  const filterComment: ICommunityPlatformReportedContent.IRequest = {
    contentType: "comment",
    page: 1,
    limit: 10,
  };
  // Date range filters
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day later
  // isDeleted filter tests
  const notDeletedFilter: ICommunityPlatformReportedContent.IRequest = {
    isDeleted: false,
    page: 1,
    limit: 10,
  };
  const deletedFilter: ICommunityPlatformReportedContent.IRequest = {
    isDeleted: true,
    page: 1,
    limit: 10,
  };
  // Combined filters
  const combinedFilter: ICommunityPlatformReportedContent.IRequest = {
    contentType: "post",
    createdAfter: past.toISOString(),
    createdBefore: future.toISOString(),
    isDeleted: false,
    page: 1,
    limit: 10,
  };
  // Test calls
  // 1. Filter by contentType post
  const responsePost =
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: filterPost,
      },
    );
  typia.assert(responsePost);
  TestValidator.predicate("response data contains only posts or empty", () =>
    responsePost.data.every(
      (r) => r.reportedPost !== null && r.reportedComment === null,
    ),
  );
  // 2. Filter by contentType comment
  const responseComment =
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: filterComment,
      },
    );
  typia.assert(responseComment);
  TestValidator.predicate("response data contains only comments or empty", () =>
    responseComment.data.every(
      (r) => r.reportedComment !== null && r.reportedPost === null,
    ),
  );
  // 3. Filter by isDeleted false
  const responseNotDeleted =
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: notDeletedFilter,
      },
    );
  typia.assert(responseNotDeleted);
  TestValidator.predicate("response data contains only not deleted", () =>
    responseNotDeleted.data.every((r) => r.deleted_at === null),
  );
  // 4. Filter by isDeleted true
  const responseDeleted =
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: deletedFilter,
      },
    );
  typia.assert(responseDeleted);
  TestValidator.predicate("response data contains only deleted", () =>
    responseDeleted.data.every((r) => r.deleted_at !== null),
  );
  // 5. Filter by createdAfter and createdBefore
  const responseDateRange =
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          createdAfter: past.toISOString(),
          createdBefore: future.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(responseDateRange);
  TestValidator.predicate("response data createdAt in date range", () =>
    responseDateRange.data.every((r) => {
      const createdAt = new Date(r.created_at);
      return createdAt > past && createdAt < future;
    }),
  );
  // 6. Combined filter
  const responseCombined =
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: combinedFilter,
      },
    );
  typia.assert(responseCombined);
  // Validate reportedPost present and reportedComment absent
  TestValidator.predicate("combined filter produces posts only", () =>
    responseCombined.data.every(
      (r) => r.reportedPost !== null && r.reportedComment === null,
    ),
  );
  // Validate pagination structure
  const paginationFields = ["current", "limit", "records", "pages"] as const;
  for (const response of [
    responsePost,
    responseComment,
    responseNotDeleted,
    responseDeleted,
    responseDateRange,
    responseCombined,
  ]) {
    paginationFields.forEach((field) => {
      TestValidator.predicate(
        `pagination field ${field} present and >= 0`,
        () =>
          typeof response.pagination[field] === "number" &&
          response.pagination[field] >= 0,
      );
    });
  }
}
