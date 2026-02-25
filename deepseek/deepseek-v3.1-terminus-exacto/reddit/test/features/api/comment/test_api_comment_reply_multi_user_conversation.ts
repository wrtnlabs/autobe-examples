import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_comments_replies_create } from "../../../generate/generate_random_community_platform_user_posts_comments_replies_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_reply_multi_user_conversation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First user creates community and post
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    },
  });
  typia.assert(firstUser);
  const community =
    await generate_random_community_platform_user_communities_create(
      firstUserConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_user_posts_create(
    firstUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Step 2: First user creates top-level comment
  const topLevelComment =
    await generate_random_community_platform_user_posts_comments_create(
      firstUserConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        },
      },
    );
  typia.assert(topLevelComment);
  // Step 3: Second user subscribes to community and creates reply
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    },
  });
  typia.assert(secondUser);
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      secondUserConnection,
      {
        body: {
          community_platform_community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  const secondUserReply =
    await generate_random_community_platform_user_posts_comments_replies_create(
      secondUserConnection,
      {
        params: { postId: post.id, commentId: topLevelComment.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: topLevelComment.id,
        },
      },
    );
  typia.assert(secondUserReply);
  // Step 4: Third user attempts to create reply without subscription
  const thirdUserConnection: api.IConnection = { host: connection.host };
  const thirdUser = await authorize_user_join(thirdUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    },
  });
  typia.assert(thirdUser);
  // Third user should fail to create reply due to lack of subscription
  await TestValidator.error("non-subscribed user cannot reply", async () => {
    await api.functional.communityPlatform.user.posts.comments.replies.create(
      thirdUserConnection,
      {
        postId: post.id,
        commentId: topLevelComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: topLevelComment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  });
  // Validate conversation structure
  TestValidator.equals(
    "reply belongs to correct post",
    secondUserReply.post.id,
    post.id,
  );
  TestValidator.equals(
    "reply author is second user",
    secondUserReply.author.id,
    secondUser.id,
  );
  TestValidator.predicate(
    "reply has valid content",
    secondUserReply.content.length > 0,
  );
}
