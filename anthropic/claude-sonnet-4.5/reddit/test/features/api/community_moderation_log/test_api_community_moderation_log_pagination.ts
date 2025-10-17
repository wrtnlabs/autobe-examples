import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationLog";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_community_moderation_log_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for accessing moderation logs
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create member account for generating content and reports
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create a community to contain moderation activities
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Create multiple posts (15 posts to generate enough content)
  const posts = await ArrayUtil.asyncRepeat(15, async (index) => {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: `Test Post ${index + 1} - ${RandomGenerator.name(3)}`,
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 5: Submit multiple content reports (20 reports to create sufficient log entries)
  const reports = await ArrayUtil.asyncRepeat(20, async (reportIndex) => {
    const targetPost = posts[reportIndex % posts.length];
    const report = await api.functional.redditLike.content_reports.create(
      connection,
      {
        body: {
          reported_post_id: targetPost.id,
          community_id: community.id,
          content_type: "post",
          violation_categories: "spam,harassment",
          additional_context: `Report ${reportIndex + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        } satisfies IRedditLikeContentReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Admin is already authenticated from Step 1, continue using the connection

  // Step 6: Retrieve first page with small page size
  const firstPage =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 7: Validate first page pagination metadata
  TestValidator.equals(
    "first page current number",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "first page has total records",
    firstPage.pagination.records >= reports.length,
  );
  TestValidator.predicate(
    "first page calculates total pages correctly",
    firstPage.pagination.pages === Math.ceil(firstPage.pagination.records / 5),
  );
  TestValidator.equals("first page data length", firstPage.data.length, 5);

  // Step 8: Retrieve second page
  const secondPage =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(secondPage);

  // Step 9: Validate second page has different data (no duplicates)
  TestValidator.equals(
    "second page current number",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page total records matches first page",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );

  const firstPageIds = firstPage.data.map((log) => log.id);
  const secondPageIds = secondPage.data.map((log) => log.id);
  const hasNoDuplicates = secondPageIds.every(
    (id) => !firstPageIds.includes(id),
  );
  TestValidator.predicate(
    "no duplicate log entries between pages",
    hasNoDuplicates,
  );

  // Step 10: Validate ordering consistency - timestamps should be consistent
  const allFirstPageTimestamps = firstPage.data.map((log) =>
    new Date(log.created_at).getTime(),
  );
  const isFirstPageOrdered = allFirstPageTimestamps.every(
    (timestamp, index, arr) => index === 0 || arr[index - 1] >= timestamp,
  );
  TestValidator.predicate(
    "first page entries are ordered by timestamp",
    isFirstPageOrdered,
  );

  // Step 11: Retrieve with larger page size
  const largePage =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 15,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(largePage);

  TestValidator.equals("large page limit", largePage.pagination.limit, 15);
  TestValidator.predicate(
    "large page data length matches limit or remaining records",
    largePage.data.length <= 15,
  );

  // Step 12: Test pagination with filtering by log_type
  const filteredPage =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
          log_type: "report_submitted",
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered page has records",
    filteredPage.data.length > 0,
  );
  const allMatchLogType = filteredPage.data.every(
    (log) => log.log_type === "report_submitted",
  );
  TestValidator.predicate(
    "all filtered entries match log_type",
    allMatchLogType,
  );

  // Step 13: Verify retrieving all pages gets all entries
  const allLogs: IRedditLikeModerationLog[] = [];
  let currentPage = 1;
  const pageLimit = 5;

  while (currentPage <= firstPage.pagination.pages) {
    const page =
      await api.functional.redditLike.admin.communities.moderation_log.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: currentPage,
            limit: pageLimit,
          } satisfies IRedditLikeModerationLog.IRequest,
        },
      );
    typia.assert(page);
    allLogs.push(...page.data);
    currentPage++;
  }

  TestValidator.equals(
    "total retrieved logs equals total records",
    allLogs.length,
    firstPage.pagination.records,
  );

  // Verify no duplicate IDs in all retrieved logs
  const allLogIds = allLogs.map((log) => log.id);
  const uniqueLogIds = new Set(allLogIds);
  TestValidator.equals(
    "no duplicate logs across all pages",
    uniqueLogIds.size,
    allLogIds.length,
  );
}
