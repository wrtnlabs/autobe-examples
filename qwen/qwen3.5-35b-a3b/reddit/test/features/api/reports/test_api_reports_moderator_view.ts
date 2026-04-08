import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_reports_moderator_view(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator user (who will also be community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(6) + "_mod",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // Step 2: Create a community with the moderator as owner
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8) + "_community",
          description: "Test community for moderator view",
        },
      },
    );
  typia.assert(community);
  // Step 3: Create a reporter user (different user to submit reports)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(6) + "_reporter",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reporterAuth);
  // Step 4: Reporter subscribes to the community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      reporterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Step 5: Reporter creates a post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        title: "Test Post for Reporting",
        post_type: "text" as const,
        text_content: "This is a test post that violates community guidelines",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Reporter submits a report on the post
  const report = await api.functional.redditPlatform.member.reports.create(
    reporterConnection,
    {
      body: {
        target_id: post.id,
        target_type: "post" as const,
        reason: "Spam content detected in post",
      },
    },
  );
  typia.assert(report);
  // Step 7: Create a second report for sorting validation
  const post2 = await api.functional.redditPlatform.member.posts.create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        title: "Second Test Post",
        post_type: "text" as const,
        text_content: "Another post for testing report sorting",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  const report2 = await api.functional.redditPlatform.member.reports.create(
    reporterConnection,
    {
      body: {
        target_id: post2.id,
        target_type: "post" as const,
        reason: "Irrelevant content",
      },
    },
  );
  typia.assert(report2);
  // Step 8: Fetch reports with default sorting (created_at DESC)
  const reportsPage = await api.functional.redditPlatform.member.reports.index(
    moderatorConnection,
    {
      body: {
        limit: 20,
      },
    },
  );
  typia.assert(reportsPage);
  // Step 9: Validate response structure
  typia.assert(reportsPage.pagination);
  typia.assert(reportsPage.data);
  // Step 10: Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    reportsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", reportsPage.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    reportsPage.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages count",
    reportsPage.pagination.pages,
    1,
  );
  // Step 11: Verify report count
  TestValidator.equals("reports list length", reportsPage.data.length, 2);
  // Step 12: Verify both reports have required fields
  const [firstReport, secondReport] = reportsPage.data;
  typia.assert(firstReport);
  typia.assert(secondReport);
  // Verify required fields in each report summary
  TestValidator.equals("first report id", firstReport.id, report.id);
  TestValidator.equals("second report id", secondReport.id, report2.id);
  TestValidator.equals("first report status", firstReport.status, "pending");
  TestValidator.equals("second report status", secondReport.status, "pending");
  TestValidator.equals(
    "first report reason",
    firstReport.reason,
    "Spam content detected in post",
  );
  TestValidator.equals(
    "second report reason",
    secondReport.reason,
    "Irrelevant content",
  );
  TestValidator.equals(
    "first report target_type",
    firstReport.target_type,
    "post",
  );
  TestValidator.equals(
    "second report target_type",
    secondReport.target_type,
    "post",
  );
  TestValidator.equals(
    "first report target_id",
    firstReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "second report target_id",
    secondReport.target_id,
    post2.id,
  );
  // Verify timestamps exist
  const createdAt1 = firstReport.created_at;
  const createdAt2 = secondReport.created_at;
  typia.assert(createdAt1);
  typia.assert(createdAt2);
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(createdAt1).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(createdAt2).getTime() > 0,
  );
  // Step 13: Verify sorting - most recent report should be first (DESC order)
  TestValidator.predicate(
    "reports sorted by created_at DESC",
    new Date(createdAt2).getTime() < new Date(createdAt1).getTime(),
  );
  // Step 14: Verify reporter identity is included
  typia.assert(firstReport.reported_by);
  typia.assert(secondReport.reported_by);
  TestValidator.predicate(
    "reporter username exists",
    firstReport.reported_by.username.length > 0,
  );
  TestValidator.predicate(
    "reporter username exists",
    secondReport.reported_by.username.length > 0,
  );
  // Step 15: Verify community context is included
  typia.assert(firstReport.community);
  typia.assert(secondReport.community);
  TestValidator.equals(
    "community name matches",
    firstReport.community.name,
    community.name,
  );
  TestValidator.equals(
    "community name matches",
    secondReport.community.name,
    community.name,
  );
  // Step 16: Verify moderator only sees reports from their community
  const pendingReports = reportsPage.data.filter((r) => r.status === "pending");
  TestValidator.equals(
    "all reports are from same community",
    pendingReports.every((r) => r.community.id === community.id),
    true,
  );
}
