import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityKarmaSnapshot";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaSnapshot";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_karma_snapshots_with_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate TARGET member
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetAuth);
  // 2. Register and authenticate VOTING member
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(voterAuth);
  // 3. TARGET member creates a post (need community_id - use random for testing)
  const post = await api.functional.redditCommunity.member.posts.create(
    targetConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. TARGET member creates a comment on their post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      targetConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. VOTING member upvotes the post (+1 karma for target)
  const postVote = await api.functional.redditCommunity.member.votes.create(
    voterConnection,
    {
      body: {
        vote_type: "upvote" as const,
        target_post_id: post.id,
        target_comment_id: null,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(postVote);
  // 6. VOTING member downvotes the comment (-1 karma for target)
  const commentVote = await api.functional.redditCommunity.member.votes.create(
    voterConnection,
    {
      body: {
        vote_type: "downvote" as const,
        target_post_id: null,
        target_comment_id: comment.id,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(commentVote);
  // 7. TARGET member retrieves karma snapshots
  const snapshots =
    await api.functional.redditCommunity.member.karma_snapshots.index(
      targetConnection,
      {
        body: {
          user_id: post.author.id,
          limit: 10,
          sort: "created_at" as const,
          order: "asc" as const,
        } satisfies IRedditCommunityKarmaSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 8. Validate karma snapshot records
  TestValidator.equals("snapshot count", snapshots.data.length, 2);
  // First snapshot: +1 karma from upvote on post
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals("first snapshot delta", firstSnapshot.karma_delta, 1);
  TestValidator.equals(
    "first snapshot karma after change",
    firstSnapshot.karma_after_change,
    1,
  );
  TestValidator.equals(
    "first snapshot vote type",
    firstSnapshot.vote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "first snapshot user matches target",
    firstSnapshot.user.id,
    post.author.id,
  );
  // Second snapshot: -1 karma from downvote on comment
  const secondSnapshot = snapshots.data[1];
  typia.assert(secondSnapshot);
  TestValidator.equals("second snapshot delta", secondSnapshot.karma_delta, -1);
  TestValidator.equals(
    "second snapshot karma after change",
    secondSnapshot.karma_after_change,
    0,
  );
  TestValidator.equals(
    "second snapshot vote type",
    secondSnapshot.vote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "second snapshot user matches target",
    secondSnapshot.user.id,
    post.author.id,
  );
}
