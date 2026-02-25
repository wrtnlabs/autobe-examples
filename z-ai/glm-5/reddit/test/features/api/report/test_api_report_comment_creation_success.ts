import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { generate_random_community_member_reports_create } from "../../../generate/generate_random_community_member_reports_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

/**
 * Test reporting a comment for moderator review.
 *
 * This test verifies the complete workflow for creating a comment report:
 * 1. Reporter member joins the platform and authenticates
 * 2. Reporter creates a community (becomes owner)
 * 3. Reporter subscribes to the community (required for posting)
 * 4. Reporter creates a post in the community
 * 5. Reporter creates a comment on the post
 * 6. Reporter reports the comment with a valid reason
 *
 * Validation includes:
 * - Report status is PENDING
 * - Content type is 'COMMENT'
 * - Content ID matches the comment's ID
 * - Reason is correctly stored
 * - Community is correctly resolved from the comment's parent post
 */
export async function test_api_report_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 2. Create a community (reporter becomes owner)
  const community = await generate_random_community_member_communities_create(
    reporterConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      reporterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    reporterConnection,
    {
      params: {
        communityName: community.name,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    reporterConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(comment);
  // 6. Report the comment
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report = await generate_random_community_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "COMMENT",
        content_id: comment.id,
        reason: reportReason,
      },
    },
  );
  typia.assert(report);
  // 7. Validate report creation
  TestValidator.equals("report status is PENDING", report.status, "PENDING");
  TestValidator.equals(
    "content type is COMMENT",
    report.content_type,
    "COMMENT",
  );
  TestValidator.equals(
    "content ID matches comment",
    report.content_id,
    comment.id,
  );
  TestValidator.equals("reason matches", report.reason, reportReason);
  TestValidator.equals(
    "community ID matches",
    report.community.id,
    community.id,
  );
  TestValidator.equals("reporter ID matches", report.reporter.id, reporter.id);
}
