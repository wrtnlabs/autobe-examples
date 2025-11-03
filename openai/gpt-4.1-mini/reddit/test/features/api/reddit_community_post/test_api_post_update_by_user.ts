import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_post_update_by_user(
  connection: api.IConnection,
) {
  // 1. User joins and authenticates
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "securePassword123",
        href: "https://example.com/",
        referrer: "https://example.com/",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Ensure content types exist: create 3 content types for 'text', 'link', 'image'
  const contentTypes: IRedditCommunityContentType[] = [];
  const contentTypeCodes = ["text", "link", "image"] as const;
  for (const code of contentTypeCodes) {
    const contentType =
      await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
        connection,
        {
          body: {
            content_type_code: code,
            content_type_name: code.charAt(0).toUpperCase() + code.slice(1),
            description: `Content type for ${code} posts`,
          } satisfies IRedditCommunityContentType.ICreate,
        },
      );
    typia.assert(contentType);
    contentTypes.push(contentType);
  }

  // 3. User creates a community
  const communityName = RandomGenerator.alphabets(8).toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: `Community for testing post updates - ${communityName}`,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // 4. User creates a post in the community
  const originalContentType = contentTypes.find(
    (ct) => ct.content_type_code === "text",
  );
  typia.assert<IRedditCommunityContentType>(originalContentType!);
  const postCreateBody = {
    title: "Original Post Title",
    body: "This is the original post body content.",
    image_uri: null,
    reddit_community_content_type_id: originalContentType!.id,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postCreateBody.title);
  TestValidator.equals("post body matches", post.body, postCreateBody.body);
  TestValidator.equals("post image_uri is null", post.image_uri, null);
  TestValidator.equals(
    "post content type id matches original",
    post.reddit_community_content_type_id,
    originalContentType!.id,
  );

  // 5. User updates the post with new data
  const newContentType = contentTypes.find(
    (ct) => ct.content_type_code === "image",
  );
  typia.assert<IRedditCommunityContentType>(newContentType!);
  const postUpdateBody = {
    reddit_community_content_type_id: newContentType!.id,
    title: "Updated Post Title",
    body: "This is the updated post body content.",
    image_uri: "https://example.com/image.jpg",
    status: "active",
  } satisfies IRedditCommunityPost.IUpdate;

  const updatedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.update(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: postUpdateBody,
      },
    );
  typia.assert(updatedPost);

  // 6. Validate updated post fields
  TestValidator.equals(
    "updated post id matches original",
    updatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "updated post title",
    updatedPost.title,
    postUpdateBody.title,
  );
  TestValidator.equals(
    "updated post body",
    updatedPost.body,
    postUpdateBody.body,
  );
  TestValidator.equals(
    "updated post image_uri",
    updatedPost.image_uri,
    postUpdateBody.image_uri,
  );
  TestValidator.equals(
    "updated post content type id",
    updatedPost.reddit_community_content_type_id,
    postUpdateBody.reddit_community_content_type_id,
  );
}
