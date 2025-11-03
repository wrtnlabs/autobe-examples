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

export async function test_api_post_creation_by_user_in_community(
  connection: api.IConnection,
) {
  // 1. Register user1 via auth.user.join
  const user1Body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: null,
    href: "https://example.com",
    referrer: "https://referrer.com",
  } satisfies IRedditCommunityUser.ICreate;
  const user1 = await api.functional.auth.user.join(connection, {
    body: user1Body,
  });
  typia.assert(user1);

  // 2. Register user2 for multi-actor setup
  const user2Body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: null,
    href: "https://example.com",
    referrer: "https://referrer.com",
  } satisfies IRedditCommunityUser.ICreate;
  const user2 = await api.functional.auth.user.join(connection, {
    body: user2Body,
  });
  typia.assert(user2);

  // 3. Register admin
  const adminCreateBody = {
    user_id: user1.id,
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // 4. Login user1 to ensure token is set
  const userLoginBody = {
    email: user1.email,
    password: "Password123!",
    ip: null,
    href: "https://example.com",
    referrer: "https://referrer.com",
  } satisfies IRedditCommunityUser.ILogin;
  const user1LoggedIn = await api.functional.auth.user.login(connection, {
    body: userLoginBody,
  });
  typia.assert(user1LoggedIn);

  // 5. Login admin to ensure token is set
  const adminLoginBody = {
    email: admin.user?.email ?? user1.email,
    password: "Password123!",
    ip: null,
    href: "https://example.com",
    referrer: "https://referrer.com",
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminLoggedIn = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoggedIn);

  // 6. Switch back to user1 for community creation
  await api.functional.auth.user.login(connection, { body: userLoginBody });

  // 7. Create a new community
  const communityBody = {
    name: RandomGenerator.name(2).replace(/\s+/g, "_"),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 8. Switch to admin for content type creation (to ensure content type exists)
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 9. Create a content type for posts (text content)
  const contentTypeBody = {
    content_type_code: "text",
    content_type_name: "Text Post",
    description: "Textual content post type",
  } satisfies IRedditCommunityContentType.ICreate;
  const contentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      { body: contentTypeBody },
    );
  typia.assert(contentType);

  // 10. Switch back to user1 for post creation
  await api.functional.auth.user.login(connection, { body: userLoginBody });

  // 11. Create a new post in the community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }).substring(0, 100),
    body: RandomGenerator.content({ paragraphs: 2 }),
    image_uri: null,
    reddit_community_content_type_id: contentType.id,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;
  const post =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      { communityName: community.name, body: postBody },
    );
  typia.assert(post);

  // 12. Validate post information
  TestValidator.equals(
    "Post user ID matches",
    post.reddit_community_user_id,
    user1.id,
  );
  TestValidator.equals(
    "Post community ID matches",
    post.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "Post content type ID matches",
    post.reddit_community_content_type_id,
    contentType.id,
  );
  TestValidator.predicate("Post title is not empty", post.title.length > 0);
  TestValidator.predicate("Post body is not empty", post.body.length > 0);
  TestValidator.equals("Post status is active", post.status, "active");
}
