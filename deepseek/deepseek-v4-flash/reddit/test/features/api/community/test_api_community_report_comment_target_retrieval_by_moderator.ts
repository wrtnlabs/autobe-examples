import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import type { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that a community owner/moderator can retrieve a pending report targeting a comment.
 *
 * Validates the complete report retrieval workflow for comment-targeted reports. Sets up two members (owner and reporter), creates a community with a text post, creates a comment, and reports it. The community owner then retrieves the report and verifies all expected fields including target type, status, comment content, reason, reporter identity, community scoping, timestamps, and null deleted_at.
 *
 * 1. Member A registers as a community member.
 * 2. Member A creates a community and becomes its owner.
 * 3. Member B registers as a separate community member.
 * 4. Member B subscribes to the community.
 * 5. Member B creates a text post within the community.
 * 6. Member B creates a top-level comment on the post.
 * 7. Member B reports the comment with target_type='comment' and provides a reason.
 * 8. Using Member A's owner/moderator connection, the report is retrieved by ID.
 * 9. Validates target_type is 'comment', status is 'pending', commentTarget contains the full comment, reportPostTarget is undefined, reason matches, reporter username matches Member B, community name matches, timestamps are valid ISO strings, and deleted_at is null.
 */
export async function test_api_community_report_comment_target_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 4: Member B subscribes to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // Step 5: Member B creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Step 6: Member B creates a top-level comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // Step 7: Member B reports the comment
  const reason = RandomGenerator.paragraph({ sentences: 1 });
  const report = await generate_random_community_platform_member_reports_create(
    memberBConnection,
    {
      body: {
        targetType: "comment",
        targetId: comment.id,
        reason,
      },
    },
  );
  typia.assert(report);
  // Step 8: Using Member A's connection (owner/moderator), retrieve the report
  const retrievedReport =
    await api.functional.communityPlatform.member.community_reports.at(
      memberAConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // Step 9: Validate report fields
  TestValidator.equals("target_type", retrievedReport.target_type, "comment");
  TestValidator.equals("status", retrievedReport.status, "pending");
  TestValidator.equals(
    "reportPostTarget is undefined",
    retrievedReport.reportPostTarget,
    undefined,
  );
  // Validate commentTarget is populated
  TestValidator.predicate(
    "commentTarget is populated",
    retrievedReport.commentTarget !== undefined,
  );
  TestValidator.equals(
    "comment id matches",
    retrievedReport.commentTarget!.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedReport.commentTarget!.comment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment author username",
    retrievedReport.commentTarget!.comment.author.username,
    memberB.username,
  );
  // Validate reason matches
  TestValidator.equals("reason matches", retrievedReport.reason, reason);
  // Validate reporter
  TestValidator.equals(
    "reporter username",
    retrievedReport.reporter.username,
    memberB.username,
  );
  // Validate community
  TestValidator.equals(
    "community name",
    retrievedReport.community.name,
    community.name,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO",
    (): boolean => !Number.isNaN(Date.parse(retrievedReport.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO",
    (): boolean => !Number.isNaN(Date.parse(retrievedReport.updated_at)),
  );
  // Validate deleted_at is null
  TestValidator.equals("deleted_at is null", retrievedReport.deleted_at, null);
}
