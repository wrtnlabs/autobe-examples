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
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_post_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. User joins and authenticates
  const userEmail = `${RandomGenerator.name(1).toLowerCase()}_user@example.com`;
  const userUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "Password123!",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(userUser);

  // 2. Create Community
  const communityBody = {
    name: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create ContentType (admin role)
  // Admin join
  const adminUser: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: userUser.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminUser);

  // Create Content Type
  const contentTypeBody = {
    content_type_code: `text_${RandomGenerator.alphaNumeric(4)}`,
    content_type_name: "Text Post",
    description: "A text content-type for posts",
  } satisfies IRedditCommunityContentType.ICreate;

  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: contentTypeBody,
      },
    );
  typia.assert(contentType);

  // Switch user context back to user using the original email
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "Password123!",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IRedditCommunityUser.ILogin,
  });

  // 4. Create Post in the community with content type
  const postBody = {
    title: `Post Title ${RandomGenerator.paragraph({ sentences: 2 })}`,
    body: RandomGenerator.content({ paragraphs: 2 }),
    image_uri: null,
    reddit_community_content_type_id: contentType.id,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postBody,
      },
    );
  typia.assert(post);

  // 5. Retrieve post details
  const retrievedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.communities.posts.at(connection, {
      communityName: community.name,
      postId: post.id,
    });
  typia.assert(retrievedPost);

  // 6. Validate retrieved matches created
  TestValidator.equals("post id", retrievedPost.id, post.id);
  TestValidator.equals("post title", retrievedPost.title, post.title);
  TestValidator.equals("post body", retrievedPost.body, post.body);
  TestValidator.equals(
    "post image_uri",
    retrievedPost.image_uri,
    post.image_uri,
  );
  TestValidator.equals(
    "post content_type_id",
    retrievedPost.reddit_community_content_type_id,
    post.reddit_community_content_type_id,
  );
  TestValidator.equals("post status", retrievedPost.status, post.status);

  TestValidator.predicate(
    "post creation timestamp exists",
    typeof retrievedPost.created_at === "string",
  );
  TestValidator.predicate(
    "post updated timestamp exists",
    typeof retrievedPost.updated_at === "string",
  );

  // 7. Test error case: retrieve non-existing post
  await TestValidator.error("non-existing post returns error", async () => {
    await api.functional.redditCommunity.communities.posts.at(connection, {
      communityName: community.name,
      postId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
