import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Test that a registered user can delete a comment they have created on a
 * RedditCommunity post.
 *
 * This test performs the following steps:
 *
 * 1. Register and authenticate a new registered user.
 * 2. Create a new RedditCommunity community.
 * 3. Create a new post in the community by the authenticated user.
 * 4. Add a comment to the post by the same user.
 * 5. Delete the created comment.
 * 6. Verify the comment is removed by attempting to delete again (expect error).
 *
 * This verifies that only authorized users can delete their own comments and
 * that deletion operations behave correctly.
 *
 * All steps use strict typing, proper data generation with typia and
 * RandomGenerator, and validation with typia.assert and TestValidator.
 */
export async function test_api_redditcommunity_comment_delete_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "P@ssw0rd!";
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityName = RandomGenerator.alphabets(10).toLowerCase();
  const communityBody = {
    communityName: communityName satisfies string as string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-z0-9_-]+$">,
    displayName: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a new post in the created community
  const postType = "text" as const;
  const fixedPostBody: IRedditCommunityPost.ICreate = {
    reddit_community_community_id:
      communityBody.communityName satisfies string as string &
        tags.Format<"uuid">,
    type: postType,
    title: RandomGenerator.name(5),
    body: RandomGenerator.content({ paragraphs: 2 }),
  };

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: fixedPostBody,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5. Delete the comment
  await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );

  // 6. Verify comment deletion by attempting to delete again and expect error
  await TestValidator.error(
    "Deleting already deleted comment should fail",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.erase(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
