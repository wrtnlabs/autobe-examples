import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_reports_comment_moderator_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts using authorize_member_join utility
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterJoin = await authorize_member_join(reporterConnection, {});
  typia.assert(reporterJoin);
  const reporter = reporterJoin;
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoin = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerJoin);
  const owner = ownerJoin;
  const authorConnection: api.IConnection = { host: connection.host };
  const authorJoin = await authorize_member_join(authorConnection, {});
  typia.assert(authorJoin);
  const author = authorJoin;
  // 2. Community owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // 3. Comment author subscribes to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies DeepPartial<ICommunityPlatformSubscription.ICreate>,
      },
    );
  typia.assert(subscription);
  // 4. Comment author creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies DeepPartial<ICommunityPlatformPostText.ICreate>,
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // 5. Comment author writes a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
      },
    );
  typia.assert(comment);
  // 6. Reporter submits a report against the comment
  const reportReason = RandomGenerator.paragraph({ sentences: 1 });
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: reportReason,
        commentId: comment.id,
      } satisfies DeepPartial<ICommunityPlatformContentReport.ICreate>,
    },
  );
  typia.assert(report);
  // 7. Community owner (moderator) retrieves the report details
  const retrievedReport =
    await api.functional.communityPlatform.member.reports.at(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);
  // 8. Validate complete information
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "reason text matches",
    retrievedReport.reason,
    reportReason,
  );
  TestValidator.equals(
    "reporter identity",
    retrievedReport.reporter.id,
    reporter.id,
  );
  TestValidator.equals(
    "reporter username",
    retrievedReport.reporter.username,
    reporter.username,
  );
  TestValidator.equals(
    "community context",
    retrievedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name",
    retrievedReport.community.name,
    community.name,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    () =>
      retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    () =>
      retrievedReport.updated_at !== null &&
      retrievedReport.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", retrievedReport.deleted_at, null);
  // 9. Validate commentReport relationship exists and has correct comment
  TestValidator.predicate(
    "commentReport exists",
    () =>
      retrievedReport.commentReport !== null &&
      retrievedReport.commentReport !== undefined,
  );
  typia.assert(retrievedReport.commentReport!);
  TestValidator.equals(
    "comment ID matches",
    retrievedReport.commentReport!.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedReport.commentReport!.comment.content,
    comment.content,
  );
  // 10. Validate postReport relationship is null (since this is a comment report)
  TestValidator.equals("postReport is null", retrievedReport.postReport, null);
  // 11. Validate approval and dismissal are null (report is pending)
  TestValidator.equals("approval is null", retrievedReport.approval, null);
  TestValidator.equals("dismissal is null", retrievedReport.dismissal, null);
}
