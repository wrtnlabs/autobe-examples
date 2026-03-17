import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
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
import { generate_random_community_platform_member_communities_reports_reviews_create } from "../../../generate/generate_random_community_platform_member_communities_reports_reviews_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_review } from "../../../prepare/prepare_random_community_platform_report_review";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_moderation_action_post_deleted_target_audit_visibility(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_slug: community.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        detail: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  const review =
    await generate_random_community_platform_member_communities_reports_reviews_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
          reportId: report.id,
        },
        body: {
          review_action: "approve",
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReportReview.ICreate,
      },
    );
  typia.assert(review);
  await api.functional.communityPlatform.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  const targetedPostBefore =
    await api.functional.communityPlatform.member.communities.moderationActions.posts.getByCommunityidAndModerationactionid(
      memberConnection,
      {
        communityId: community.id,
        moderationActionId: review.id,
      },
    );
  typia.assert(targetedPostBefore);
  TestValidator.equals(
    "target post id preserved",
    targetedPostBefore.id,
    post.id,
  );
  TestValidator.predicate(
    "deleted lifecycle state is preserved",
    targetedPostBefore.deleted_at !== null,
  );
  TestValidator.equals(
    "target post author preserved",
    targetedPostBefore.author.id,
    authorized.id,
  );
  TestValidator.equals(
    "target post community preserved",
    targetedPostBefore.community.id,
    community.id,
  );
  const targetedPostAfter =
    await api.functional.communityPlatform.member.communities.moderationActions.posts.getByCommunityidAndModerationactionid(
      memberConnection,
      {
        communityId: community.id,
        moderationActionId: review.id,
      },
    );
  typia.assert(targetedPostAfter);
  TestValidator.equals(
    "read-only retrieval keeps same post id",
    targetedPostAfter.id,
    targetedPostBefore.id,
  );
  TestValidator.equals(
    "read-only retrieval keeps same author",
    targetedPostAfter.author.id,
    targetedPostBefore.author.id,
  );
  TestValidator.equals(
    "read-only retrieval keeps same community",
    targetedPostAfter.community.id,
    targetedPostBefore.community.id,
  );
  TestValidator.predicate(
    "read-only retrieval does not restore deleted post",
    targetedPostAfter.deleted_at !== null,
  );
}
