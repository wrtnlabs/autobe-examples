import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_comment_deletion_by_registered_user(
  connection: api.IConnection,
) {
  // 1. First user registration and authentication
  const user1_email = typia.random<string & tags.Format<"email">>();
  const user1_password = "P@ssw0rd123";
  const user1: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: user1_email,
        password: user1_password,
        ip: null,
        href: "https://web.example.com/registration",
        referrer: "https://web.example.com",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(user1);

  // 2. Create a community by user1
  const communityName = RandomGenerator.alphaNumeric(8);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: {
          communityName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "active",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "Community name matches",
    community.communityName,
    communityName,
  );

  // 3. Create a post in the community by user1
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postContent = RandomGenerator.content({ paragraphs: 2 });
  const postType = "text" as const;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: {
          community_code: communityName,
          title: postTitle,
          type: postType,
          content: postContent,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals("Post title matches", post.title, postTitle);

  // 4. Create a comment on the post by user1
  const commentContent = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      {
        body: {
          post_id: post.id,
          content: commentContent,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "Comment content matches",
    comment.content,
    commentContent,
  );

  // 5. Register and authenticate a second user (not the author)
  const user2_email = typia.random<string & tags.Format<"email">>();
  const user2_password = "P@ssword456";
  const user2: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: user2_email,
        password: user2_password,
        ip: null,
        href: "https://web.example.com/registration",
        referrer: "https://web.example.com",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(user2);

  // 6. Attempt to delete the comment as user2 and expect error
  await TestValidator.error(
    "Unauthorized user cannot delete comment",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.erase(
        connection,
        {
          redditCommunityCommentId: comment.id,
        },
      );
    },
  );

  // 7. Re-authenticate as user1 (comment author) by joining again
  await api.functional.auth.registeredUser.join(connection, {
    body: {
      typeName: "IRedditCommunityRegisteredUser.IJoin",
      email: user1_email,
      password: user1_password,
      ip: null,
      href: "https://web.example.com/registration",
      referrer: "https://web.example.com",
    } satisfies IRedditCommunityRegisteredUser.IJoin,
  });

  // 8. Delete comment as user1
  await api.functional.redditCommunity.registeredUser.redditCommunityComments.erase(
    connection,
    {
      redditCommunityCommentId: comment.id,
    },
  );

  // 9. Confirm deletion is permanent by attempting again and expecting error
  await TestValidator.error(
    "Deleted comment cannot be deleted again",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunityComments.erase(
        connection,
        {
          redditCommunityCommentId: comment.id,
        },
      );
    },
  );
}
