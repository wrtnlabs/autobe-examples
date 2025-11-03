import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // 1. User registration and authorization
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        ip: null,
        href: "https://localhost/login",
        referrer: "https://localhost/",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a Reddit community
  const communityCreateBody: IRedditCommunityCommunity.ICreate = {
    name: "testcommunity" + RandomGenerator.alphaNumeric(5),
    description: "Test community created for E2E test.",
  };
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3. Create a post in the community
  // To fulfill content type, assuming we can pick a realistic UUID for it
  // But since content type ID format is uuid, we generate a random UUID for test
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody: IRedditCommunityPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    image_uri: null,
    reddit_community_content_type_id: contentTypeId,
    status: "active",
  };
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentCreateBody: IRedditCommunityComment.ICreate = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 5. Update the comment by the author
  const updatedCommentBody: IRedditCommunityComment.IUpdate = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
  };
  const updatedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.update(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        commentId: comment.id,
        body: updatedCommentBody,
      },
    );
  typia.assert(updatedComment);

  // 6. Verify that the comment author is still the same and the body has changed
  TestValidator.equals(
    "comment author is unchanged",
    updatedComment.reddit_community_user_id,
    comment.reddit_community_user_id,
  );
  TestValidator.notEquals(
    "comment body has been updated",
    updatedComment.body,
    comment.body,
  );
}
