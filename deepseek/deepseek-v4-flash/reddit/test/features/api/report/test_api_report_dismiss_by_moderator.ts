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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_dismiss_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a community — the member becomes owner/moderator
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe the member to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  // Step 4: Create a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // Step 5: Report the post
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        targetType: "post",
        targetId: post.id,
      } satisfies DeepPartial<ICommunityPlatformReport.ICreate>,
    },
  );
  typia.assert(report);
  // Step 6: Dismiss the report
  const dismissed =
    await api.functional.communityPlatform.member.reports.dismiss(
      memberConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(dismissed);
  // Step 7: Validate the report was dismissed
  TestValidator.equals("status is dismissed", dismissed.status, "dismissed");
  TestValidator.predicate(
    "updated_at is recent",
    () => new Date(dismissed.updated_at).getTime() > Date.now() - 5000,
  );
}
