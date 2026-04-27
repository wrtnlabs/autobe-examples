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

export async function test_api_report_post_target_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join - this member becomes the community owner/moderator
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community (creator becomes owner with moderation authority)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          images: [
            {
              name: "icon.png",
              mime_type: "image/png",
              size: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              url: typia.random<string & tags.Format<"uri">>(),
            } satisfies ICommunityPlatformCommunityImage.ICreate,
          ],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe the member to the community (required to create posts)
  const subscription =
    await api.functional.communityPlatform.member.communities.subscribers.create(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityId: community.id,
        type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Report the post (targetType = 'post')
  const report = await api.functional.communityPlatform.member.reports.create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        targetType: "post" as const,
        targetId: post.id,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Retrieve the post target association for the report
  const postTarget =
    await api.functional.communityPlatform.member.reports.post_target.at(
      memberConnection,
      { reportId: report.id },
    );
  typia.assert(postTarget);
  // 7. Validate response structure and values
  TestValidator.equals("report id matches", postTarget.report.id, report.id);
  TestValidator.equals(
    "report reason matches",
    postTarget.report.reason,
    report.reason,
  );
  TestValidator.equals("post id matches", postTarget.post.id, post.id);
  TestValidator.equals("post title matches", postTarget.post.title, post.title);
  TestValidator.predicate(
    "post target id exists",
    typeof postTarget.id === "string",
  );
  TestValidator.predicate(
    "created_at value exists",
    typeof postTarget.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at value exists",
    typeof postTarget.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is null (active report)",
    postTarget.deleted_at === null,
  );
}
