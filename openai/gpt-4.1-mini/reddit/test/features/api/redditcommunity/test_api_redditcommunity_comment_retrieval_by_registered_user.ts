import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_comment_retrieval_by_registered_user(
  connection: api.IConnection,
) {
  // 1. RegisteredUser joins to obtain authentication and context
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password: "password123",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Create a new community
  const communityName: string = RandomGenerator.alphabets(12);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: {
          communityName: communityName,
          displayName: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          imageUrl: null,
          isPrivate: false,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post under community
  const postType: "text" = "text"; // Use text to provide body content
  const postTitle: string = RandomGenerator.paragraph({ sentences: 5 });
  const postBody: string = RandomGenerator.content({ paragraphs: 3 });

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: {
          reddit_community_community_id: community.communityName,
          type: postType,
          title: postTitle,
          body: postBody,
          link_url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Add comments to the post
  const commentContent1: string = RandomGenerator.paragraph({ sentences: 6 });
  const firstComment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: commentContent1,
          parent_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(firstComment);

  // Optionally add a nested second comment as reply
  const commentContent2: string = RandomGenerator.paragraph({ sentences: 4 });
  const secondComment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: commentContent2,
          parent_id: firstComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(secondComment);

  // 5. Retrieve a specific comment (test target is second comment)
  const retrievedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.at(
      connection,
      {
        postId: post.id,
        commentId: secondComment.id,
      },
    );
  typia.assert(retrievedComment);

  // 6. Validate the retrieved comment matches created comment
  TestValidator.equals(
    "retrieved comment ID equals created comment ID",
    retrievedComment.id,
    secondComment.id,
  );
  TestValidator.equals(
    "retrieved comment postId matches original post id",
    retrievedComment.post_id,
    post.id,
  );
  TestValidator.equals(
    "retrieved comment content matches original content",
    retrievedComment.content,
    commentContent2,
  );

  // 7. Validate author structure is summary type
  typia.assert(retrievedComment.author);
  TestValidator.predicate(
    "retrieved comment author has valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedComment.author.id,
    ),
  );
  TestValidator.predicate(
    "retrieved comment author email includes @",
    retrievedComment.author.email.includes("@"),
  );
  TestValidator.equals(
    "retrieved comment author deleted_at is null",
    retrievedComment.author.deleted_at,
    null,
  );
}
