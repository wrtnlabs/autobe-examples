import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
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
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_vote } from "../../../prepare/prepare_random_reddit_clone_vote";

/**
 * Test comment vote direction change functionality.
 *
 * This test validates the complete vote change workflow:
 * 1. Creates two member accounts (voter and comment author)
 * 2. Creates a community and subscribes the author
 * 3. Creates a post by the comment author
 * 4. Creates a comment by the comment author
 * 5. Voter casts initial UPVOTE on the comment
 * 6. Voter changes vote from UPVOTE to DOWNVOTE
 * 7. Validates vote record update (vote_type, updated_at)
 * 8. Tests reverse change from DOWNVOTE to UPVOTE
 */
export async function test_api_comment_vote_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords for potential re-authentication
  const voterPassword = RandomGenerator.alphaNumeric(16);
  const authorPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: voterPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voterAuth);
  // 2. Create comment author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: authorPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorAuth);
  // Store initial author karma score
  const initialAuthorKarma = authorAuth.karma_score.score;
  // 3. Create community (author creates and owns it)
  const community = await api.functional.redditClone.communities.create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Create post by comment author in the community
  const post = await api.functional.redditClone.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment by comment author on the post
  const comment = await api.functional.redditClone.member.posts.comments.create(
    authorConnection,
    {
      postId: post.id,
      body: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneComment.ICreate,
    },
  );
  typia.assert(comment);
  // 6. Voter casts initial UPVOTE on the comment
  const initialVote =
    await api.functional.redditClone.member.comments.vote.postByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditCloneVote.ICreate,
      },
    );
  typia.assert(initialVote);
  TestValidator.equals("initial vote type", initialVote.vote_type, "UPVOTE");
  // 7. Change vote from UPVOTE to DOWNVOTE
  const changedVote =
    await api.functional.redditClone.member.comments.vote.postByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "DOWNVOTE",
        } satisfies IRedditCloneVote.ICreate,
      },
    );
  typia.assert(changedVote);
  TestValidator.equals("changed vote type", changedVote.vote_type, "DOWNVOTE");
  TestValidator.predicate(
    "updated_at is newer than created_at after vote change",
    new Date(changedVote.updated_at).getTime() >
      new Date(changedVote.created_at).getTime(),
  );
  TestValidator.notEquals(
    "vote timestamps differ after change",
    changedVote.created_at,
    changedVote.updated_at,
  );
  // 8. Test reverse change from DOWNVOTE to UPVOTE
  const reverseVote =
    await api.functional.redditClone.member.comments.vote.postByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditCloneVote.ICreate,
      },
    );
  typia.assert(reverseVote);
  TestValidator.equals("reverse vote type", reverseVote.vote_type, "UPVOTE");
  TestValidator.predicate(
    "reverse updated_at is newer than previous updated_at",
    new Date(reverseVote.updated_at).getTime() >
      new Date(changedVote.updated_at).getTime(),
  );
  // 9. Test vote removal (setting to null)
  const removedVote =
    await api.functional.redditClone.member.comments.vote.postByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: null,
        } satisfies IRedditCloneVote.ICreate,
      },
    );
  typia.assert(removedVote);
  TestValidator.equals("removed vote type", removedVote.vote_type, null);
}
