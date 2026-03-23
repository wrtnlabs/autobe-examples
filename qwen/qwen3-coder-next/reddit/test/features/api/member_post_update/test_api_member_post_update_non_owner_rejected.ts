import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_post_update_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (post owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member1);
  // 2. Create a post as member1 (owner)
  const post = await generate_random_reddit_like_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  const postId = post.id;
  // 3. Register second member (attempting updater)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member2);
  // 4. Attempt to update post created by member1 as member2 (non-owner)
  const updateBody = {
    title: RandomGenerator.name(3),
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikePost.IUpdate;
  // Verify that update operation is rejected
  await TestValidator.error("non-owner post update rejected", async () => {
    await api.functional.redditLike.member.posts.update(member2Connection, {
      postId,
      body: updateBody,
    });
  });
  // 5. Verify original post content remains unchanged
  const retrievedPost = await api.functional.redditLike.member.posts.update(
    member1Connection,
    {
      postId,
      body: { title: post.title } satisfies IRedditLikePost.IUpdate, // Restore original title
    },
  );
  typia.assert(retrievedPost);
  TestValidator.equals(
    "post owner unchanged",
    retrievedPost.author.id,
    member1.id,
  );
  TestValidator.equals("post title preserved", retrievedPost.title, post.title);
}
