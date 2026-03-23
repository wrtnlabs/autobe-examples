import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a community moderator can retrieve all pending content reports for their moderated community.
 * This test verifies that moderators can see reports submitted by any user in communities they moderate,
 * with proper filtering by status and content type.
 */
export async function test_api_report_moderator_view_community_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: "owner@test.com",
      password: "password123",
      username: "owner_user",
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community as member A
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: "test_community",
          description: "Test community for moderation",
        },
      },
    );
  typia.assert(community);
  // 3. Register and authenticate as member B (moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: "mod@test.com",
      password: "password123",
      username: "mod_user",
    },
  });
  typia.assert(moderatorAuth);
  // 4. Add member B as moderator to the community (by owner)
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: moderatorAuth.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Register and authenticate as member C (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: "reporter@test.com",
      password: "password123",
      username: "reporter_user",
    },
  });
  typia.assert(reporterAuth);
  // 6. Create a post in the community as member C
  const post = await generate_random_reddit_clone_member_posts_create(
    reporterConnection,
    {
      body: {
        title: "Test post for reporting",
        postType: "text",
        communityId: community.id,
        content: "This is a test post content.",
      },
    },
  );
  typia.assert(post);
  // 7. Submit a report on the post as member C
  const report = await generate_random_reddit_clone_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "post",
        reason: "This content violates community guidelines",
        post_id: post.id,
      },
    },
  );
  typia.assert(report);
  // 8. Switch authentication to member B (moderator) and retrieve reports
  const reportsPage = await api.functional.redditClone.member.reports.index(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(reportsPage);
  // Verify response contains the report
  TestValidator.predicate(
    "reports page contains data",
    reportsPage.data.length > 0,
  );
  // Verify the report is visible to moderator
  const foundReport = reportsPage.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "moderator can see report submitted by other user",
    foundReport !== undefined,
  );
  // Verify report details
  if (foundReport) {
    TestValidator.equals(
      "reporter username matches",
      foundReport.reporter.username,
      reporterAuth.username,
    );
    TestValidator.equals(
      "reported post id matches",
      foundReport.reportedPost?.id,
      post.id,
    );
    TestValidator.equals(
      "community id matches",
      foundReport.community.id,
      community.id,
    );
    TestValidator.equals(
      "report status is pending",
      foundReport.status,
      "pending",
    );
  }
  // Test with status='pending' filter
  const pendingReportsPage =
    await api.functional.redditClone.member.reports.index(moderatorConnection, {
      body: {
        community_id: community.id,
        status: "pending",
      },
    });
  typia.assert(pendingReportsPage);
  TestValidator.predicate(
    "pending filter returns reports",
    pendingReportsPage.data.length > 0,
  );
  // Test with content_type='post' filter
  const postReportsPage = await api.functional.redditClone.member.reports.index(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        content_type: "post",
      },
    },
  );
  typia.assert(postReportsPage);
  TestValidator.predicate(
    "post content type filter returns reports",
    postReportsPage.data.length > 0,
  );
  // Test combined filters
  const combinedFilterPage =
    await api.functional.redditClone.member.reports.index(moderatorConnection, {
      body: {
        community_id: community.id,
        status: "pending",
        content_type: "post",
      },
    });
  typia.assert(combinedFilterPage);
  TestValidator.predicate(
    "combined filters return correct reports",
    combinedFilterPage.data.length > 0,
  );
}
