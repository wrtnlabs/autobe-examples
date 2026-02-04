import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_reports_report } from "../../../generate/generate_random_community_platform_member_posts_comments_reports_report";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_report_approval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection to authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new owner using authorize_owner_join utility function
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformOwner.IJoin,
  });
  typia.assert(owner);
  // Step 3: Create a new connection to authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 4: Register a new member using authorize_member_join utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 5: Use member connection to create a new post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Step 6: Use member connection to create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // Step 7: Use member connection to report the comment
  const report =
    await generate_random_community_platform_member_posts_comments_reports_report(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 10,
          }), // Ensures 10-500 character range requirement
        },
      },
    );
  typia.assert(report);
  // Step 8: Switch to owner connection to approve the report
  const approvedReport =
    await api.functional.communityPlatform.owner.moderation.reports.approve(
      ownerConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // Step 9: Validate that the approved report has the same ID as the original report
  TestValidator.equals(
    "approved report ID matches original report ID",
    approvedReport.id,
    report.id,
  );
  // Validate reporter_id is the same
  TestValidator.equals(
    "approved report reporter_id matches original reporter_id",
    approvedReport.reporter_id,
    report.reporter_id,
  );
  // Validate target_comment_id is preserved
  TestValidator.equals(
    "approved report target_comment_id matches original",
    approvedReport.target_comment_id,
    report.target_comment_id,
  );
  // No validation of status field since it's not defined in ICommunityPlatformReport DTO
  // No validation of karma or comment deletion since APIs don't expose these
}
