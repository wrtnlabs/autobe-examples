import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarmaScoreChange";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScoreChange";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_comments_vote_post_by_commentid } from "../../../generate/generate_random_reddit_clone_member_comments_vote_post_by_commentid";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_vote } from "../../../prepare/prepare_random_reddit_clone_vote";

/**
 * Test retrieving karma score change history generated from comment votes with source type filtering.
 *
 * This test validates that the karma score change history endpoint correctly filters
 * changes by source_type. The scenario creates:
 * - 2 comment upvotes (+1 karma each) from members B and C
 * - 1 post downvote (-1 karma) from member C
 *
 * When querying with source_type='COMMENT', only the 2 comment votes should be returned,
 * excluding the post vote.
 */
export async function test_api_karma_score_change_history_comment_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (karma score owner) registration
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Member A creates a community
  const community = await generate_random_reddit_clone_communities_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(community);
  // 3. Member A creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 4. Member A creates a comment on their own post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        },
      },
    );
  typia.assert(comment);
  // 5. Member B registration and authentication
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 6. Member B upvotes member A's comment (+1 karma change)
  const memberBVote =
    await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
      memberBConnection,
      {
        params: { commentId: comment.id },
        body: { vote_type: "UPVOTE" },
      },
    );
  typia.assert(memberBVote);
  // 7. Member C registration and authentication
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberC);
  // 8. Member C upvotes member A's comment (+1 karma change)
  const memberCVoteComment =
    await generate_random_reddit_clone_member_comments_vote_post_by_commentid(
      memberCConnection,
      {
        params: { commentId: comment.id },
        body: { vote_type: "UPVOTE" },
      },
    );
  typia.assert(memberCVoteComment);
  // 9. Member C downvotes member A's post (-1 karma change, to be filtered out)
  const memberCVotePost = await generate_random_reddit_clone_member_posts_vote(
    memberCConnection,
    {
      params: { postId: post.id },
      body: { vote_type: "DOWNVOTE" },
    },
  );
  typia.assert(memberCVotePost);
  // 10. Retrieve member A's karma score ID
  const karmaScore = await api.functional.redditClone.karma_scores.at(
    memberAConnection,
    {
      memberId: memberA.id,
    },
  );
  typia.assert(karmaScore);
  // 11. Query karma changes with source_type='COMMENT' filter
  const karmaChanges =
    await api.functional.redditClone.karma_scores.changes.index(
      memberAConnection,
      {
        karmaScoreId: karmaScore.id,
        body: {
          source_type: "COMMENT",
          page: 1,
          limit: 20,
          sort: "created_at:desc",
        },
      },
    );
  typia.assert(karmaChanges);
  // Validate: Exactly 2 karma change events from comment votes
  TestValidator.equals(
    "total records should be 2 (only comment votes)",
    karmaChanges.pagination.records,
    2,
  );
  TestValidator.equals(
    "data array length should be 2",
    karmaChanges.data.length,
    2,
  );
  // Validate both changes have +1 change_amount from upvotes
  for (const change of karmaChanges.data) {
    TestValidator.equals(
      "change amount should be +1 (upvote)",
      change.change_amount,
      1,
    );
    TestValidator.equals(
      "source_type should be COMMENT",
      change.source_type,
      "COMMENT",
    );
    TestValidator.predicate(
      "source_title should not be empty",
      change.source_title.length > 0,
    );
  }
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    karmaChanges.pagination.current,
    1,
  );
  TestValidator.equals(
    "total pages should be 1",
    karmaChanges.pagination.pages,
    1,
  );
}