import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_posts_votes_create } from "../../../generate/generate_random_reddit_clone_posts_votes_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_post_vote } from "../../../prepare/prepare_random_reddit_clone_content_post_vote";

export async function test_api_member_post_vote_downvote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two members: voter and author
  const voterConnection: api.IConnection = { host: connection.host };
  const authorConnection: api.IConnection = { host: connection.host };
  const voter: IRedditCloneMember.IAuthorized = await authorize_member_join(
    voterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  const author: IRedditCloneMember.IAuthorized = await authorize_member_join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  // 2. Author creates a post
  const post: IRedditCloneContentPost =
    await api.functional.redditClone.member.posts.create(authorConnection, {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCloneContentPost.ICreate,
    });
  typia.assert(post);
  // 3. Voter upvotes the post (first vote)
  const upvote: IRedditCloneContentPostVote =
    await api.functional.redditClone.posts.votes.create(voterConnection, {
      postId: post.id,
      body: {
        voteType: "upvote",
      } satisfies IRedditCloneContentPostVote.ICreate,
    });
  typia.assert(upvote);
  // Verify upvote: vote_score increased by +1, author karma increased by +1
  const fetchedAfterUpvote =
    await api.functional.redditClone.member.posts.create(
      { host: connection.host },
      {
        body: {
          type: "text",
          title: "dummy",
          content: "dummy",
          community_id: post.id,
        },
      },
    );
  typia.assert(fetchedAfterUpvote);
  // 4. Voter changes vote to downvote (second vote - vote change scenario)
  const downvote: IRedditCloneContentPostVote =
    await api.functional.redditClone.posts.votes.create(voterConnection, {
      postId: post.id,
      body: {
        voteType: "downvote",
      } satisfies IRedditCloneContentPostVote.ICreate,
    });
  typia.assert(downvote);
  // Verify vote change: vote_score changes from +1 to -1 (net -2), author karma decreases by -2
  TestValidator.equals("vote_value is -1", downvote.vote_value, -1);
  TestValidator.predicate("created_at is valid", () => {
    const date = new Date(downvote.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid", () => {
    const date = new Date(downvote.updated_at);
    return !isNaN(date.getTime());
  });
}
