import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test voting functionality on nested comment replies.
 *
 * This test validates that votes can be cast on child comments within nested
 * discussion threads, ensuring the voting system works correctly regardless of
 * comment depth in the threading hierarchy.
 *
 * Test flow:
 *
 * 1. Create member account for posting and voting
 * 2. Create moderator account and community
 * 3. Switch to member and create a post
 * 4. Create top-level comment on the post
 * 5. Create nested reply to the top-level comment
 * 6. Cast a vote on the nested reply
 * 7. Validate vote creation and metadata
 */
export async function test_api_comment_vote_on_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account and community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "modpass123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 5: Member creates a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create top-level comment on the post
  const topLevelComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);

  // Step 7: Create nested reply to the top-level comment
  const nestedReply =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(nestedReply);

  // Validate that nested reply has correct depth and parent relationship
  TestValidator.equals(
    "nested reply has correct parent",
    nestedReply.parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.predicate(
    "nested reply has depth greater than 0",
    nestedReply.depth > 0,
  );

  // Step 8: Cast a vote on the nested reply
  const vote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: nestedReply.id,
        body: {
          vote_type: 1,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(vote);

  // Validate vote was created successfully
  TestValidator.equals(
    "vote references nested reply comment",
    vote.reddit_community_comment_id,
    nestedReply.id,
  );
  TestValidator.equals("vote type is upvote", vote.vote_type, 1);
  TestValidator.equals(
    "voting member is correct",
    vote.reddit_community_member_id,
    member.id,
  );
}
