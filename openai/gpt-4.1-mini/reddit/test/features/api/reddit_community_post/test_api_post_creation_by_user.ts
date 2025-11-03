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

export async function test_api_post_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User registration and authorization
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123!",
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IRedditCommunityUser.ICreate;

  const userAuth: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreate });
  typia.assert(userAuth);

  // 2. Admin registration and authorization
  const adminCreate = {
    user_id: userAuth.id,
  } satisfies IRedditCommunityAdmin.ICreate;

  // First, admin user join with realistic credentials
  const adminUserCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
  } satisfies IRedditCommunityUser.ICreate;

  const adminUserAuth: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: adminUserCreate });
  typia.assert(adminUserAuth);

  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: adminUserAuth.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 3. Admin creates valid content type `text`
  const contentTypeCreate = {
    content_type_code: "text",
    content_type_name: "Text",
    description: "Plain text content type",
  } satisfies IRedditCommunityContentType.ICreate;

  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      { body: contentTypeCreate },
    );
  typia.assert(contentType);

  // 4. User creates a community
  const communityCreate = {
    name: `community-${RandomGenerator.alphabets(6)}`,
    description: "Test community for post creation",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // 5. User creates a post with valid content type and unique title
  const postCreate = {
    title: `Post Title ${RandomGenerator.alphaNumeric(5)}`,
    body: "This is the body of the post for testing.",
    reddit_community_content_type_id: contentType.id,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreate,
      },
    );
  typia.assert(post);

  // 6. Validate post properties
  TestValidator.equals("post title matches", post.title, postCreate.title);
  TestValidator.equals("post body matches", post.body, postCreate.body);
  TestValidator.equals(
    "post content type id matches",
    post.reddit_community_content_type_id,
    contentType.id,
  );
  TestValidator.equals("post status is active", post.status, "active");
  TestValidator.equals(
    "post community id matches",
    post.reddit_community_community_id,
    community.id,
  );

  // 7. Attempt to create post with duplicate title in the same community - expect error
  await TestValidator.error("duplicate post title should fail", async () => {
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: postCreate.title,
          body: "Another body with duplicate title.",
          reddit_community_content_type_id: contentType.id,
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  });

  // 8. Attempt to create a post with invalid content type id - expect error
  await TestValidator.error("invalid content type id should fail", async () => {
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: `Invalid contentType ${RandomGenerator.alphaNumeric(5)}`,
          body: "Body with invalid content type id.",
          reddit_community_content_type_id:
            "00000000-0000-0000-0000-000000000000",
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  });
}
