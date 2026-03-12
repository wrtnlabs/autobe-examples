import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a community moderator can successfully view detailed information about a pending content report.
 *
 * 1. Moderator member registers
 * 2. Moderator creates a community
 * 3. Moderator creates a post in the community
 * 4. Reporter member registers
 * 5. Reporter submits a report on the post
 * 6. Moderator views the report details
 * 7. Validate report information is correctly populated
 */
export async function test_api_report_view_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator member registration
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Moderator creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Moderator creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Reporter member registration
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reporterAuth);
  // 5. Reporter submits a report on the post
  const report = await generate_random_reddit_clone_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "post",
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post.id,
      },
    },
  );
  typia.assert(report);
  // 6. Moderator views the report details
  const viewedReport = await api.functional.redditClone.member.reports.at(
    moderatorConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(viewedReport);
  // 7. Validate report information
  TestValidator.equals("report ID matches", viewedReport.id, report.id);
  TestValidator.equals(
    "content type is post",
    viewedReport.content_type,
    "post",
  );
  TestValidator.equals(
    "reporter matches",
    viewedReport.reporter.id,
    reporterAuth.id,
  );
  TestValidator.equals(
    "community matches",
    viewedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "reported post matches",
    viewedReport.reportedPost?.id,
    post.id,
  );
  TestValidator.equals(
    "report reason matches",
    viewedReport.reason,
    report.reason,
  );
  TestValidator.equals("status is pending", viewedReport.status, "pending");
  TestValidator.equals(
    "reportedComment is null",
    viewedReport.reportedComment,
    null,
  );
  TestValidator.predicate(
    "created_at exists",
    viewedReport.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    viewedReport.updated_at !== null,
  );
}
