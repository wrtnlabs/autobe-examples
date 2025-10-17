import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

export async function test_api_user_karma_after_post_upvotes(
  connection: api.IConnection,
) {
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = typia.random<string & tags.MinLength<8>>();

  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(author);

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  const initialKarma: IRedditLikeUser.IKarma =
    await api.functional.redditLike.users.karma.at(connection, {
      userId: author.id,
    });
  typia.assert(initialKarma);

  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = typia.random<string & tags.MinLength<8>>();

  const voter: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: voterEmail,
        password: voterPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(voter);

  const vote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(vote);

  const updatedKarma: IRedditLikeUser.IKarma =
    await api.functional.redditLike.users.karma.at(connection, {
      userId: author.id,
    });
  typia.assert(updatedKarma);

  TestValidator.equals(
    "post_karma increased by 1",
    updatedKarma.post_karma,
    initialKarma.post_karma + 1,
  );
  TestValidator.equals(
    "total_karma reflects increase",
    updatedKarma.total_karma,
    initialKarma.total_karma + 1,
  );
}
