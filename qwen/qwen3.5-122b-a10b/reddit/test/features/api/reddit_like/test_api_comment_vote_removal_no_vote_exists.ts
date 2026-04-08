import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
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

/**
 * Test comment vote removal when no vote exists.
 *
 * Validates that attempting to remove a vote from a comment that the member has not voted on returns a 404 error. This test ensures the system properly handles the case where a member tries to retract a non-existent vote.
 *
 * The test follows this workflow:
 * 1. First member authenticates and creates a post
 * 2. Second member creates a comment on that post
 * 3. First member attempts to remove a vote they never cast
 * 4. System returns 404 Not Found error
 *
 * 1. Member A joins and authenticates
 * 2. Member A creates a post in a community
 * 3. Member B joins and authenticates
 * 4. Member B creates a comment on Member A's post
 * 5. Member A attempts to remove vote from the comment (no vote exists)
 * 6. Validates 404 error is returned with appropriate message
 */
export async function test_api_comment_vote_removal_no_vote_exists(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.redditLike.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(memberA);
  // 2. Member A creates a post
  const post = await api.functional.redditLike.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Member B joins and authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await api.functional.redditLike.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(memberB);
  // 4. Member B creates a comment on Member A's post
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberBConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 5. Member A attempts to remove vote from comment (no vote exists)
  // 6. Validate 404 error is returned
  await TestValidator.httpError(
    "removing non-existent vote returns 404",
    404,
    async () => {
      await api.functional.redditLike.member.comments.votes.erase(
        memberAConnection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
