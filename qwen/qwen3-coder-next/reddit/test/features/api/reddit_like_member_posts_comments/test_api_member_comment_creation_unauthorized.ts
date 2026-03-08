import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
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
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_comment_creation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a member and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "1234",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 1. Guest access (no auth token)
  {
    const guestConnection: api.IConnection = {
      host: connection.host,
      headers: {},
    };
    await TestValidator.httpError(
      "guest access should return 401",
      401,
      async () => {
        await api.functional.redditLike.member.posts.comments.create(
          guestConnection,
          {
            postId: post.id,
            body: {
              content: "Test comment",
            } satisfies IRedditLikeComment.ICreate,
          },
        );
      },
    );
  }
  // 2. Non-existent post ID
  {
    await TestValidator.httpError(
      "non-existent post should return 404",
      404,
      async () => {
        await api.functional.redditLike.member.posts.comments.create(
          memberConnection,
          {
            postId: "00000000-0000-0000-0000-000000000000",
            body: {
              content: "Test comment",
            } satisfies IRedditLikeComment.ICreate,
          },
        );
      },
    );
  }
  // 3. Invalid postId format
  {
    await TestValidator.httpError(
      "invalid postId format should return 400",
      400,
      async () => {
        await api.functional.redditLike.member.posts.comments.create(
          memberConnection,
          {
            postId: "not-a-uuid",
            body: {
              content: "Test comment",
            } satisfies IRedditLikeComment.ICreate,
          },
        );
      },
    );
  }
  // 4. Content validation
  {
    // Empty content (0 chars)
    await TestValidator.httpError(
      "empty content should return 422",
      422,
      async () => {
        await api.functional.redditLike.member.posts.comments.create(
          memberConnection,
          {
            postId: post.id,
            body: {
              content: "" satisfies string & tags.MinLength<1>,
            } satisfies IRedditLikeComment.ICreate,
          },
        );
      },
    );
    // Content too long (>10000 chars)
    await TestValidator.httpError(
      "content too long should return 422",
      422,
      async () => {
        await api.functional.redditLike.member.posts.comments.create(
          memberConnection,
          {
            postId: post.id,
            body: {
              content: RandomGenerator.content({ paragraphs: 100 }),
            } satisfies IRedditLikeComment.ICreate,
          },
        );
      },
    );
    // Content only whitespace
    await TestValidator.httpError(
      "whitespace-only content should return 422",
      422,
      async () => {
        await api.functional.redditLike.member.posts.comments.create(
          memberConnection,
          {
            postId: post.id,
            body: {
              content: "   " satisfies string & tags.MinLength<1>,
            } satisfies IRedditLikeComment.ICreate,
          },
        );
      },
    );
  }
}
