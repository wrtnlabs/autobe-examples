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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_report_approval_by_moderator_post_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator (admin actor)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_admin_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderator);
  // 2. Create community creator member (will also be post author to avoid subscription issue)
  const communityCreatorConnection: api.IConnection = { host: connection.host };
  const communityCreator = await authorize_member_join(
    communityCreatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(communityCreator);
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      communityCreatorConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Assign moderator role to admin user in community
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      communityCreatorConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderator.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  TestValidator.equals(
    "moderator role assigned to admin user",
    moderationRole.member.id,
    moderator.id,
  );
  // 5. Create text post in community (community creator is owner, automatically subscribed)
  const post = await generate_random_community_platform_member_posts_create(
    communityCreatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post author is community creator",
    post.author.id,
    communityCreator.id,
  );
  // 6. Create reporting member (different from community creator and moderator)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporter);
  TestValidator.notEquals(
    "reporter is not community creator",
    reporter.id,
    communityCreator.id,
  );
  TestValidator.notEquals(
    "reporter is not moderator",
    reporter.id,
    moderator.id,
  );
  // 7. Submit report against the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
        commentId: null,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report is pending", report.status, "pending");
  TestValidator.equals(
    "report targets correct post",
    report.postReport?.post.id,
    post.id,
  );
  TestValidator.equals("report is in correct community", report.community.id, community.id);
}