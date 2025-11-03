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

export async function test_api_comment_update_by_user(
  connection: api.IConnection,
) {
  // 1. User registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "ValidPass123!";
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://reddit.com", // Sample client URL
        referrer: "https://reddit.com/home",
        ip: null,
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. User login
  const login: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://reddit.com",
        referrer: "https://reddit.com/home",
        ip: null,
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(login);

  // 3. Community creation
  const communityName = RandomGenerator.name(1)
    .replace(/\s+/g, "")
    .toLowerCase();
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 7,
  });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Post creation
  // Using an existing content type ID; since not provided, we generate a uuid as placeholder
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 6,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 7,
  });
  const postStatus = "active";

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentTypeId,
          status: postStatus,
          image_uri: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 5. Comment creation
  const commentBodyInitial = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 7,
  });
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: {
          body: commentBodyInitial,
          parent_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 6. Update comment
  const commentBodyUpdated = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const updatedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.update(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        commentId: comment.id,
        body: {
          body: commentBodyUpdated,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // 7. Validate updated comment body content
  TestValidator.equals(
    "comment body should be updated",
    updatedComment.body,
    commentBodyUpdated,
  );
}
