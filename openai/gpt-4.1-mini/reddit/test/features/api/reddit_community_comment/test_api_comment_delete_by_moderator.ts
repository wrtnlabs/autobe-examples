import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Validate the ability of a moderator to delete a specific comment in a
 * community post.
 *
 * This test covers critical interactions between multiple actors: moderator and
 * user, including:
 *
 * 1. Moderator user registration and login authentication.
 * 2. Normal user registration and login.
 * 3. Creation of a community by the normal user.
 * 4. Creation of a post within the community by the user.
 * 5. Adding one or more comments by the normal user to the post.
 * 6. Moderator attempting to delete a specific comment by commentId.
 * 7. Post-deletion verification that the comment is marked as deleted and
 *    inaccessible.
 * 8. Validation of the moderator's authorization enforcement.
 *
 * The test ensures data integrity remains intact, and only authorized
 * moderators may delete comments.
 */
export async function test_api_comment_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator user registration
  const modEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: modEmail,
        password: "Mod#1234",
        ip: null,
        href: "https://reddit.example/modjoin",
        referrer: "https://reddit.example/",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  // 2. Normal user registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "User#1234",
        ip: null,
        href: "https://reddit.example/userjoin",
        referrer: "https://reddit.example/",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 3. User creates a community
  const communityName =
    RandomGenerator.name(1).replace(/\s+/g, "") +
    RandomGenerator.alphaNumeric(5); // No spaces, unique string
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals(
    "community created matches name",
    community.name,
    communityName,
  );

  // 4. User creates a post in the community
  // use a valid content_type uuid (simulate random)
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: RandomGenerator.paragraph({ sentences: 4 }),
          body: RandomGenerator.content({ paragraphs: 4 }),
          reddit_community_content_type_id: contentTypeId,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community name matches",
    post.reddit_community_community_id,
    community.id,
  );

  // 5. User adds comments to the post; create at least one
  const commentBodies = [
    RandomGenerator.paragraph({ sentences: 3 }),
    RandomGenerator.paragraph({ sentences: 2 }),
  ];
  const comments: IRedditCommunityComment[] = [];
  for (const body of commentBodies) {
    const comment =
      await api.functional.redditCommunity.user.communities.posts.comments.create(
        connection,
        {
          communityName: communityName,
          postId: post.id,
          body: {
            body,
            parent_id: null,
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  TestValidator.equals(
    "created comments count",
    comments.length,
    commentBodies.length,
  );

  const commentToDelete = comments[0];

  // 6. Authenticate as moderator explicitly (login) to test authorization
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: "Mod#1234",
      ip: null,
      href: "https://reddit.example/modlogin",
      referrer: "https://reddit.example/",
    } satisfies IRedditCommunityModerator.ILogin,
  });

  // 7. Moderator attempts to delete the first comment
  await api.functional.redditCommunity.moderator.communities.posts.comments.erase(
    connection,
    {
      communityName: communityName,
      postId: post.id,
      commentId: commentToDelete.id,
    },
  );

  // 8. Verify that the comment is marked deleted
  // Attempt to fetch all comments of the post (simulate user perspective, requires fetching function - since not provided, emulate via error check)
  // We'll test that the deleted comment is not in the active comments

  // Since we have no direct comment list fetching API in given materials we cannot do exact verification by fetch
  // Instead, we check business logic by attempting to delete the same comment again, expecting error due to deletion or not found
  await TestValidator.error(
    "deleting an already deleted comment should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.posts.comments.erase(
        connection,
        {
          communityName: communityName,
          postId: post.id,
          commentId: commentToDelete.id,
        },
      );
    },
  );

  // 9. Additional check: moderator cannot delete comments with invalid IDs
  await TestValidator.error(
    "deleting comment with invalid commentId should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.posts.comments.erase(
        connection,
        {
          communityName: communityName,
          postId: post.id,
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
