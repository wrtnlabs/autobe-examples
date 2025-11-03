import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_redditcomment_update_by_moderator(
  connection: api.IConnection,
) {
  // Moderator user registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "StrongP@ssword123",
      href: "https://example.com/",
      referrer: "https://example.com/referrer",
    } satisfies IRedditCommunityModerator.IJoin,
  });
  typia.assert(moderator);

  // Moderator login to ensure authentication and session management
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "StrongP@ssword123",
      href: "https://example.com/",
      referrer: "https://example.com/referrer",
    } satisfies IRedditCommunityModerator.ILogin,
  });

  // Create a new community
  const communityName = RandomGenerator.name(1)
    .toLowerCase()
    .replace(/\s+/g, "");
  const community =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Create a new content type
  const contentTypeCode = "text";
  const contentTypeName = "Text";
  const contentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: {
          content_type_code: contentTypeCode,
          content_type_name: contentTypeName,
          description: "Textual content type for posts",
        } satisfies IRedditCommunityContentType.ICreate,
      },
    );
  typia.assert(contentType);

  // Create a new post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: postTitle,
          body: postBody,
          reddit_community_content_type_id: contentType.id,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // Create a new comment on the post
  const commentText = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: {
          body: commentText,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Moderator updates the comment content
  const updatedCommentBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditCommunity.moderator.communities.posts.comments.update(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updatedCommentBody,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Verify updated content
  TestValidator.equals(
    "comment body has been updated",
    updatedComment.body,
    updatedCommentBody,
  );
  TestValidator.predicate(
    "comment updated_at timestamp is recent",
    new Date(updatedComment.updated_at).getTime() > Date.now() - 1000 * 60 * 5, // updated within last 5 minutes
  );
}
