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
export async function test_api_report_approval_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner connection and register owner with randomized credentials
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = typia.random<string & tags.MinLength<8>>();
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner: ICommunityPlatformOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: {
        email: ownerEmail,
        password: ownerPassword,
      },
    },
  );
  typia.assert(owner);
  // Step 2: Create member connection and register member with randomized credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      },
    });
  typia.assert(member);
  // Step 3: Login member to acquire session with same credentials used for join
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // Step 4: Member creates a post
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph(),
          text: RandomGenerator.content(),
        },
      },
    );
  typia.assert(post);
  // Step 5: Member creates a comment on the post
  const comment: ICommunityPlatformComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(comment);
  // Step 6: Member reports the comment
  const report: ICommunityPlatformReport =
    await generate_random_community_platform_member_posts_comments_reports_report(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 10,
            wordMax: 15,
          }),
        },
      },
    );
  typia.assert(report);
  // Step 7: Owner logs in to handle moderation with same credentials used for join
  await authorize_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  // Step 8: Owner approves the report (first approval)
  const approvedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.owner.moderation.reports.approve(
      ownerConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // Step 9: Owner attempts to approve the same report again (second approval)
  await TestValidator.error("Report has already been processed", async () => {
    await api.functional.communityPlatform.owner.moderation.reports.approve(
      ownerConnection,
      {
        reportId: report.id,
      },
    );
  });
}