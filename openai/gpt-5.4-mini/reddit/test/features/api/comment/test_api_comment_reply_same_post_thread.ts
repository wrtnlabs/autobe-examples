import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_comments_create } from "../../../generate/generate_random_community_platform_member_comments_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_reply_same_post_thread(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "1234",
      username: `user_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(),
        contentType: "text",
        text: { body: true },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const parentComment =
    await generate_random_community_platform_member_comments_create(
      memberConnection,
      {
        body: {
          community_platform_post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  const reply = await generate_random_community_platform_member_comments_create(
    memberConnection,
    {
      body: {
        community_platform_post_id: post.id,
        parent_id: parentComment.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(reply);
  TestValidator.equals(
    "reply keeps the same post reference",
    reply.post,
    parentComment.post,
  );
  TestValidator.equals(
    "reply parent is the created parent comment",
    reply.parent,
    parentComment.parent,
  );
  TestValidator.equals(
    "reply author is the authenticated member",
    reply.member,
    member,
  );
  const otherPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          title: RandomGenerator.name(),
          contentType: "text",
          text: { body: true },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(otherPost);
  const otherParent =
    await generate_random_community_platform_member_comments_create(
      memberConnection,
      {
        body: {
          community_platform_post_id: otherPost.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(otherParent);
  await TestValidator.error(
    "reject reply with parent from different post",
    async () => {
      await generate_random_community_platform_member_comments_create(
        memberConnection,
        {
          body: {
            community_platform_post_id: post.id,
            parent_id: otherParent.id,
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
