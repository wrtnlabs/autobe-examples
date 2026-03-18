import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_single_view_text_post_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  const textBody = RandomGenerator.paragraph({ sentences: 2 });
  const title = RandomGenerator.name(3);
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title,
        body_text: textBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  const createdPostRaw = await api.functional.communityPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title,
        body_text: textBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  const createdPost = typia.assert<Pick<ICommunityPlatformPost, "id">>(
    createdPostRaw as unknown,
  );

  const post = await api.functional.communityPlatform.member.posts.at(
    memberConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(post);

  TestValidator.equals("title matches", post.title, title);
  TestValidator.predicate(
    "textContent is non-empty",
    post.textContent.trim().length > 0,
  );
  TestValidator.equals(
    "linkContent is null for text post",
    post.linkContent,
    null,
  );
  TestValidator.equals(
    "imageContent is null for text post",
    post.imageContent,
    null,
  );
  TestValidator.equals("deletedAt is null", post.deletedAt, null);
  TestValidator.equals("postType is text", post.postType, "text");
  TestValidator.predicate(
    "timeSince is non-empty",
    post.timeSince.trim().length > 0,
  );
  TestValidator.predicate(
    "voteScore is int32",
    Number.isInteger(post.voteScore),
  );
  TestValidator.predicate(
    "commentsCount is int32",
    Number.isInteger(post.commentsCount),
  );
  TestValidator.equals(
    "author id matches member",
    post.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community id matches created community",
    post.community.id,
    community.id,
  );
}
