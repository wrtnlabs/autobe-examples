import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_votes_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_comment_vote } from "../../../prepare/prepare_random_reddit_clone_comment_vote";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test viewing a user profile with negative karma score.
 *
 * Validates that profiles with negative karma are displayed correctly without restrictions. The test creates two member accounts: a target user whose content will receive downvotes, and a voter who casts downvotes on that content. After downvoting all posts and comments, the target's karma becomes negative.
 *
 * Special attention is given to verifying that negative karma does not restrict profile viewing functionality and that all content remains visible.
 *
 * 1. Register target member account for the user whose karma will become negative.
 * 2. Register voter member account that will cast downvotes.
 * 3. Target user creates multiple posts in a community.
 * 4. Target user creates comments on their own posts.
 * 5. Voter casts downvotes on all target user's posts.
 * 6. Voter casts downvotes on all target user's comments.
 * 7. Retrieve target user's profile and validate negative karma display.
 * 8. Verify karma calculation reflects sum of all downvotes.
 */
export async function test_api_profile_negative_karma_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register target member account
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetMember);
  // 2. Register voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterMember = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(voterMember);
  // 3. Target user creates multiple posts (need at least 2 to ensure negative karma)
  const post1 = await generate_random_reddit_clone_member_posts_create(
    targetConnection,
    {},
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    targetConnection,
    {},
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_clone_member_posts_create(
    targetConnection,
    {},
  );
  typia.assert(post3);
  // 4. Target user creates comments on their own posts
  const comment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      targetConnection,
      {
        params: { postId: post1.id },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      targetConnection,
      {
        params: { postId: post2.id },
      },
    );
  typia.assert(comment2);
  // 5. Voter casts downvotes on all target user's posts
  await generate_random_reddit_clone_member_posts_votes_create(
    voterConnection,
    {
      params: { postId: post1.id },
      body: { vote_type: "downvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_votes_create(
    voterConnection,
    {
      params: { postId: post2.id },
      body: { vote_type: "downvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_votes_create(
    voterConnection,
    {
      params: { postId: post3.id },
      body: { vote_type: "downvote" },
    },
  );
  // 6. Voter casts downvotes on all target user's comments
  await generate_random_reddit_clone_member_posts_comments_votes_create(
    voterConnection,
    {
      params: { postId: post1.id, commentId: comment1.id },
      body: { vote_type: "downvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_comments_votes_create(
    voterConnection,
    {
      params: { postId: post2.id, commentId: comment2.id },
      body: { vote_type: "downvote" },
    },
  );
  // 7. Retrieve target user's profile
  const profile = await api.functional.redditClone.profiles.at(connection, {
    profileId: targetMember.id,
  });
  typia.assert(profile);
  // 8. Validate negative karma display
  TestValidator.predicate("karma is negative", profile.karma < 0);
  // 9. Verify all posts are still visible despite negative karma
  TestValidator.equals("posts count", profile.posts.length, 3);
  // 10. Verify all comments are still visible despite negative karma
  TestValidator.equals("comments count", profile.comments.length, 2);
  // 11. Verify karma calculation: 3 posts downvoted (-3) + 2 comments downvoted (-2) = -5
  TestValidator.equals("karma calculation", profile.karma, -5);
  // 12. Verify profile fields are accessible
  TestValidator.predicate(
    "display_name exists",
    profile.display_name.length > 0,
  );
  TestValidator.predicate("created_at exists", profile.created_at.length > 0);
}
