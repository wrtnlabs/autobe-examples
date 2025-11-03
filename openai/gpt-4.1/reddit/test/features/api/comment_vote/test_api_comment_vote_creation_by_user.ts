import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Verifies an authenticated user can create an upvote or downvote for a
 * comment.
 *
 * This function simulates the complete workflow:
 *
 * 1. Register (join) a new user
 * 2. Create a new community
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Submit an upvote for the comment and verify single vote per user per comment
 * 6. Attempt a downvote to ensure vote toggling (update not duplicate)
 * 7. Assert that the correct vote state is returned
 */
export async function test_api_comment_vote_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://community.example.com/register",
    referrer: "https://google.com",
  } satisfies ICommunityPlatformUser.IJoin;

  const authorized = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2. Create a new community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    text_body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: commentBody,
    },
  );
  typia.assert(comment);

  // 5. Submit an upvote for the comment
  const upvoteReq = {
    community_platform_comment_id: comment.id,
    is_upvote: true,
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const upvote =
    await api.functional.communityPlatform.user.commentVotes.create(
      connection,
      {
        body: upvoteReq,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("vote is upvote", upvote.is_upvote, true);
  TestValidator.equals(
    "vote links to correct comment",
    upvote.community_platform_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote links to correct user",
    upvote.community_platform_user_id,
    authorized.id,
  );

  // Calling the same upvote again should not create a new vote (single vote per user per comment)
  const upvoteAgain =
    await api.functional.communityPlatform.user.commentVotes.create(
      connection,
      {
        body: upvoteReq,
      },
    );
  typia.assert(upvoteAgain);
  TestValidator.equals(
    "vote is still upvote after repeat",
    upvoteAgain.is_upvote,
    true,
  );
  TestValidator.equals(
    "vote id is unchanged when upvoting again",
    upvoteAgain.id,
    upvote.id,
  );

  // 6. Submit a downvote (toggle), should update the vote record rather than duplicate
  const downvoteReq = {
    community_platform_comment_id: comment.id,
    is_upvote: false,
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const downvote =
    await api.functional.communityPlatform.user.commentVotes.create(
      connection,
      {
        body: downvoteReq,
      },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "vote is toggled to downvote",
    downvote.is_upvote,
    false,
  );
  TestValidator.equals(
    "vote id remains same after vote toggle",
    downvote.id,
    upvote.id,
  );
  TestValidator.equals(
    "vote links to correct comment after toggle",
    downvote.community_platform_comment_id,
    comment.id,
  );
}
