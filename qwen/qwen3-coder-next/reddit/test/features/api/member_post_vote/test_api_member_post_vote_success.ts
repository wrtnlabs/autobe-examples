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
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_post_vote } from "../../../prepare/prepare_random_reddit_clone_content_post_vote";

export async function test_api_member_post_vote_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const votingMemberConnection: api.IConnection = { host: connection.host };
  const postAuthorConnection: api.IConnection = { host: connection.host };
  // 1. Register voting member
  const votingMember = await authorize_member_join(votingMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(votingMember);
  // 2. Register post author
  const postAuthor = await authorize_member_join(postAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(postAuthor);
  // 3. Create a post
  const post = await api.functional.redditClone.member.posts.create(
    postAuthorConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Test upvote (score +1)
  const upvoteResult = await api.functional.redditClone.member.posts.vote(
    votingMemberConnection,
    {
      postId: post.id,
      body: {
        voteType: "upvote",
      } satisfies IRedditCloneContentPostVote.ICreate,
    },
  );
  typia.assert(upvoteResult);
  TestValidator.equals("upvote voteType", upvoteResult.voteType, "upvote");
  TestValidator.equals("upvote userVote", upvoteResult.userVote, "upvote");
  TestValidator.equals("upvote score +1", upvoteResult.voteScore, 1);
  // 5. Test changing to downvote (from upvote to downvote = net -2, so score goes from +1 to -1)
  const downvoteResult = await api.functional.redditClone.member.posts.vote(
    votingMemberConnection,
    {
      postId: post.id,
      body: {
        voteType: "downvote",
      } satisfies IRedditCloneContentPostVote.ICreate,
    },
  );
  typia.assert(downvoteResult);
  TestValidator.equals(
    "downvote voteType",
    downvoteResult.voteType,
    "downvote",
  );
  TestValidator.equals(
    "downvote userVote",
    downvoteResult.userVote,
    "downvote",
  );
  TestValidator.equals(
    "downvote score -2 from upvote to downvote",
    downvoteResult.voteScore,
    -1,
  );
  // 6. Test removing vote (from downvote to none = net +1, so score goes from -1 to 0)
  const removeVoteResult = await api.functional.redditClone.member.posts.vote(
    votingMemberConnection,
    {
      postId: post.id,
      body: { voteType: "none" } satisfies IRedditCloneContentPostVote.ICreate,
    },
  );
  typia.assert(removeVoteResult);
  TestValidator.equals(
    "remove vote voteType",
    removeVoteResult.voteType,
    "none",
  );
  TestValidator.equals(
    "remove vote userVote",
    removeVoteResult.userVote,
    "none",
  );
  TestValidator.equals(
    "remove vote score +1 from downvote to none",
    removeVoteResult.voteScore,
    0,
  );
}
