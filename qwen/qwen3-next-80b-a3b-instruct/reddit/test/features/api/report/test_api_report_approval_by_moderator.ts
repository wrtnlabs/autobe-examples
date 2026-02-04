import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_reports_report } from "../../../generate/generate_random_community_platform_member_posts_comments_reports_report";
import { generate_random_community_platform_communities_posts_new_create } from "../../../generate/generate_random_community_platform_communities_posts_new_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_report_approval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformModerator.IJoin;
  await authorize_moderator_join(moderatorConnection, { body: moderatorData });
  // Step 2: Create a new connection and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberData });
  // Step 3: Create a community using the member connection
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // Step 4: Create a post in the community using the member connection
  const post =
    await generate_random_community_platform_communities_posts_new_create(
      memberConnection,
      {
        params: { communityCode: community.community_code },
        body: {
          title: RandomGenerator.name(),
          text: RandomGenerator.content(),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  // Step 5: Add a comment to the post
  // Note: The API schema doesn't show a function to create a comment,
  // so we'll simulate a comment ID as a UUID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Step 6: Submit a report on the comment by the member
  const report =
    await generate_random_community_platform_member_posts_comments_reports_report(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: commentId,
        },
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  // Step 7: Approve the report as the moderator
  const approvedReport =
    await api.functional.communityPlatform.moderator.moderation.reports.approve(
      moderatorConnection,
      { reportId: report.id },
    );
  typia.assert(approvedReport);
  // Step 8: Verify the approved report object
  // The approved report should have the same id as the original report
  TestValidator.equals(
    "approved report id matches original",
    approvedReport.id,
    report.id,
  );
  TestValidator.equals(
    "approved report reporter_id matches original",
    approvedReport.reporter_id,
    report.reporter_id,
  );
  TestValidator.equals(
    "approved report target_comment_id matches original",
    approvedReport.target_comment_id,
    report.target_comment_id,
  );
}
