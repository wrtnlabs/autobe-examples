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

export async function test_api_post_update_author_success_text_content(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const originalTitle = RandomGenerator.name();
  const originalBody = RandomGenerator.content({ paragraphs: 1 });
  const postCreated = typia.assert<ICommunityPlatformPost>(
    await api.functional.communityPlatform.member.posts.create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: originalTitle,
          body_text: originalBody,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    ),
  );
  typia.assert(postCreated);
  const postId = postCreated.id;
  const baselineEditedAt =
    postCreated.editedAt !== null
      ? postCreated.editedAt
      : postCreated.createdAt;
  const updatedTitle = RandomGenerator.name();
  const updatedBody = RandomGenerator.content({ paragraphs: 2 });
  const updatedPayload = {
    title: updatedTitle,
    body: updatedBody,
    post_type: "text",
    link_url: null,
    image_cover_url: null,
    image_alt_text: null,
  } satisfies ICommunityPlatformPost.IUpdate;
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      authorConnection,
      {
        postId,
        body: updatedPayload,
      },
    );
  typia.assert(updatedPost);
  TestValidator.equals("updated post id matches", updatedPost.id, postId);
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "textContent updated",
    updatedPost.textContent,
    updatedBody,
  );
  TestValidator.equals("linkContent null", updatedPost.linkContent, null);
  TestValidator.equals("imageContent null", updatedPost.imageContent, null);
  TestValidator.predicate(
    "editedAt is non-null",
    updatedPost.editedAt !== null,
  );
  TestValidator.predicate(
    "editedAt advances",
    new Date(updatedPost.editedAt!).getTime() >
      new Date(baselineEditedAt).getTime(),
  );
  TestValidator.equals(
    "author id unchanged",
    updatedPost.author.id,
    postCreated.author.id,
  );
  TestValidator.equals(
    "community id unchanged",
    updatedPost.community.id,
    postCreated.community.id,
  );
  TestValidator.equals("postType is text", updatedPost.postType, "text");
}
