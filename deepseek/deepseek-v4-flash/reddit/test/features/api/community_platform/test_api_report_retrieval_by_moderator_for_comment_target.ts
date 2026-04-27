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

export async function test_api_report_retrieval_by_moderator_for_comment_target(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A joins
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
  // Step 3: Member A subscribes to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // Step 4: Member A creates a text post
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postBody = RandomGenerator.content({ paragraphs: 1 });
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text" as const,
        title: postTitle,
        body: postBody,
      },
    },
  );
  typia.assert(post);
  // Step 5: Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 6: Member B writes a comment on Member A's post
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          content: commentContent,
        },
      },
    );
  typia.assert(comment);
  // Step 7: Member A (moderator/owner) submits a report against Member B's comment
  const reportReason = RandomGenerator.paragraph({ sentences: 1 });
  const report = await generate_random_community_platform_member_reports_create(
    memberAConnection,
    {
      body: {
        targetType: "comment" as const,
        targetId: comment.id,
        reason: reportReason,
      },
    },
  );
  typia.assert(report);
  // Step 8: Member A retrieves the report
  const retrievedReport =
    await api.functional.communityPlatform.member.reports.at(
      memberAConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // Step 9: Validate the report content
  TestValidator.equals(
    "status is pending",
    retrievedReport.status,
    "pending" as const,
  );
  TestValidator.equals(
    "target type is comment",
    retrievedReport.target_type,
    "comment" as const,
  );
  TestValidator.equals(
    "reporter is member A",
    retrievedReport.reporter.username,
    memberA.username,
  );
  TestValidator.equals(
    "community matches",
    retrievedReport.community.id,
    community.id,
  );
  TestValidator.predicate(
    "created_at is present",
    retrievedReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedReport.updated_at.length > 0,
  );
  // Validate commentTarget contains the full comment
  TestValidator.predicate(
    "commentTarget is present",
    retrievedReport.commentTarget !== undefined,
  );
  if (retrievedReport.commentTarget !== undefined) {
    TestValidator.equals(
      "comment content matches",
      retrievedReport.commentTarget.comment.content,
      commentContent,
    );
    TestValidator.equals(
      "comment author is member B",
      retrievedReport.commentTarget.comment.author.username,
      memberB.username,
    );
    TestValidator.equals(
      "vote score is 0",
      retrievedReport.commentTarget.comment.voteScore,
      0,
    );
    TestValidator.equals(
      "replies is empty",
      retrievedReport.commentTarget.comment.replies.length,
      0,
    );
    TestValidator.predicate(
      "comment createdAt is present",
      retrievedReport.commentTarget.comment.createdAt.length > 0,
    );
    TestValidator.predicate(
      "comment updatedAt is present",
      retrievedReport.commentTarget.comment.updatedAt.length > 0,
    );
  }
  // Validate reportPostTarget is absent since target_type is 'comment'
  TestValidator.equals(
    "reportPostTarget is absent",
    retrievedReport.reportPostTarget,
    undefined,
  );
}
