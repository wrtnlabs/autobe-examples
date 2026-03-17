import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_moderation_action_post_owner_audit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(owner);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      ownerConnection,
      {
        body: {
          community_slug: community.slug,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const post = await generate_random_community_platform_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const moderationActionRequest = {
    target_type: "post",
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformModerationAction.IRequest;
  const moderationActionsPage =
    await api.functional.communityPlatform.member.communities.moderationActions.index(
      ownerConnection,
      {
        communityId: community.id,
        body: moderationActionRequest,
      },
    );
  typia.assert(moderationActionsPage);
  const moderationAction = moderationActionsPage.data.find(
    (action) => action.targetType === "post" && action.targetId === post.id,
  );
  TestValidator.predicate(
    "fixture moderation action exists for created post",
    moderationAction !== undefined,
  );
  const moderationActionSnapshot = typia.assert(moderationAction!);
  const postSnapshot = typia.assert(post);
  TestValidator.equals(
    "moderation action target linkage matches created post",
    moderationActionSnapshot.targetId,
    postSnapshot.id,
  );
  TestValidator.equals(
    "moderation action community matches created community",
    moderationActionSnapshot.community.id,
    community.id,
  );
  const targetedPost =
    await api.functional.communityPlatform.member.communities.moderationActions.posts.getByCommunityidAndModerationactionid(
      ownerConnection,
      {
        communityId: community.id,
        moderationActionId: moderationActionSnapshot.id,
      },
    );
  typia.assert(targetedPost);
  TestValidator.equals("targeted post id", targetedPost.id, postSnapshot.id);
  TestValidator.equals(
    "targeted post title",
    targetedPost.title,
    postSnapshot.title,
  );
  TestValidator.equals(
    "targeted post type",
    targetedPost.post_type,
    postSnapshot.post_type,
  );
  TestValidator.equals(
    "targeted post status",
    targetedPost.status,
    postSnapshot.status,
  );
  TestValidator.equals(
    "targeted post author",
    targetedPost.author,
    postSnapshot.author,
  );
  TestValidator.equals(
    "targeted post community",
    targetedPost.community,
    postSnapshot.community,
  );
  TestValidator.equals(
    "requested community id matches response",
    targetedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "vote score preserved",
    targetedPost.voteScore,
    postSnapshot.voteScore,
  );
  TestValidator.equals(
    "comment count preserved",
    targetedPost.commentCount,
    postSnapshot.commentCount,
  );
  TestValidator.equals(
    "created_at preserved",
    targetedPost.created_at,
    postSnapshot.created_at,
  );
  TestValidator.equals(
    "updated_at preserved",
    targetedPost.updated_at,
    postSnapshot.updated_at,
  );
  TestValidator.equals(
    "deleted_at preserved",
    targetedPost.deleted_at,
    postSnapshot.deleted_at,
  );
  TestValidator.equals(
    "text content preserved",
    targetedPost.textContent,
    postSnapshot.textContent,
  );
  TestValidator.equals("link preserved", targetedPost.link, postSnapshot.link);
  TestValidator.equals(
    "post image preserved",
    targetedPost.postImage,
    postSnapshot.postImage,
  );
  const moderationActionsPageAfter =
    await api.functional.communityPlatform.member.communities.moderationActions.index(
      ownerConnection,
      {
        communityId: community.id,
        body: moderationActionRequest,
      },
    );
  typia.assert(moderationActionsPageAfter);
  const moderationActionAfter = moderationActionsPageAfter.data.find(
    (action) => action.id === moderationActionSnapshot.id,
  );
  TestValidator.predicate(
    "moderation action remains available after audit retrieval",
    moderationActionAfter !== undefined,
  );
  TestValidator.equals(
    "moderation action unchanged after audit retrieval",
    typia.assert(moderationActionAfter!),
    moderationActionSnapshot,
  );
}
