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

/**
 * This E2E test validates updating an existing post by its original author
 * within a Reddit-like community.
 *
 * It involves multiple actors: two users and an admin, demonstrating
 * authentication, role switching, community creation, content type setup by
 * admin, post creation (simulated due to lack of create API), post updating,
 * and unauthorized access prevention.
 *
 * Steps:
 *
 * 1. Register and login User 1 (author).
 * 2. Register and login User 2 (unauthorized user).
 * 3. Register and login Admin user.
 * 4. Admin creates a content type (e.g., text).
 * 5. User 1 creates a community.
 * 6. User 1 creates a post within the community (simulated using update API).
 * 7. User 1 updates the post.
 * 8. User 2 attempts to update User 1's post and fails.
 *
 * Each step includes type assertions and validations to ensure API contracts
 * and business logic enforcement.
 */
export async function test_api_post_update_by_author(
  connection: api.IConnection,
) {
  // 1. User 1 registration and login
  const user1Create = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    href: "https://test-client.app/",
    referrer: "https://test-client.app/referrer",
  } satisfies IRedditCommunityUser.ICreate;
  const user1: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: user1Create });
  typia.assert(user1);

  // Login user1 explicitly
  const user1Login = {
    email: user1Create.email,
    password: user1Create.password,
    ip: null,
    href: "https://test-client.app/",
    referrer: "https://test-client.app/referrer",
  } satisfies IRedditCommunityUser.ILogin;
  await api.functional.auth.user.login(connection, { body: user1Login });

  // 2. User 2 registration and login
  const user2Create = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AnotherStrongPass456$",
    href: "https://test-client.app/",
    referrer: "https://test-client.app/referrer",
  } satisfies IRedditCommunityUser.ICreate;
  const user2: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: user2Create });
  typia.assert(user2);

  const user2Login = {
    email: user2Create.email,
    password: user2Create.password,
    ip: null,
    href: "https://test-client.app/",
    referrer: "https://test-client.app/referrer",
  } satisfies IRedditCommunityUser.ILogin;

  // 3. Admin user registration and login
  const adminUserCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass789#",
    href: "https://test-admin.app/",
    referrer: "https://test-admin.app/referrer",
  } satisfies IRedditCommunityUser.ICreate;
  const adminUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: adminUserCreate });
  typia.assert(adminUser);

  const adminCreate = {
    user_id: adminUser.id,
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(admin);

  const adminLoginData = {
    email: adminUserCreate.email,
    password: adminUserCreate.password,
    ip: null,
    href: "https://test-admin.app/",
    referrer: "https://test-admin.app/referrer",
  } satisfies IRedditCommunityAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginData });

  // 4. Admin creates content type
  const contentTypeCreate = {
    content_type_code: "text",
    content_type_name: "Text Content",
    description: "Standard text-based post",
  } satisfies IRedditCommunityContentType.ICreate;
  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      { body: contentTypeCreate },
    );
  typia.assert(contentType);

  // Switch back to user1
  await api.functional.auth.user.login(connection, { body: user1Login });

  // 5. User1 creates community
  const communityCreate = {
    name: `community_${RandomGenerator.alphabets(10)}`,
    description: "Test community for post update",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // 6. User1 simulates post creation (no explicit create API provided)
  //    Use a generated UUID for postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Simulated initial post data
  const initialPostData: IRedditCommunityPost.IUpdate = {
    id: postId,
    reddit_community_user_id: user1.id,
    reddit_community_community_id: community.id,
    reddit_community_content_type_id: contentType.id,
    title: `Original Post Title ${RandomGenerator.paragraph({ sentences: 2 })}`,
    body: RandomGenerator.content({ paragraphs: 1 }),
    image_uri: null,
    status: "active",
  };

  // Use update API to simulate creation (assumed to create if not exist for test purpose)
  const initialPost: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.update(
      connection,
      {
        communityName: community.name,
        postId: postId,
        body: initialPostData,
      },
    );
  typia.assert(initialPost);

  // 7. User1 updates the post
  const postUpdateData: IRedditCommunityPost.IUpdate = {
    title: `Updated Post Title ${RandomGenerator.paragraph({ sentences: 3 })}`,
    body: RandomGenerator.content({ paragraphs: 2 }),
    image_uri: null,
    status: "active",
  };
  const updatedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.update(
      connection,
      {
        communityName: community.name,
        postId: postId,
        body: {
          ...postUpdateData,
          id: postId,
          reddit_community_user_id: user1.id,
          reddit_community_community_id: community.id,
          reddit_community_content_type_id: contentType.id,
        },
      },
    );
  typia.assert(updatedPost);

  TestValidator.equals(
    "Updated post title matches",
    updatedPost.title,
    postUpdateData.title,
  );
  TestValidator.equals(
    "Updated post body matches",
    updatedPost.body,
    postUpdateData.body,
  );

  // 8. User2 login
  await api.functional.auth.user.login(connection, { body: user2Login });

  // 9. User2 attempts unauthorized update - should fail
  await TestValidator.error(
    "Unauthorized user cannot update other user's post",
    async () => {
      await api.functional.redditCommunity.user.communities.posts.update(
        connection,
        {
          communityName: community.name,
          postId: postId,
          body: {
            id: postId,
            reddit_community_user_id: user1.id,
            reddit_community_community_id: community.id,
            reddit_community_content_type_id: contentType.id,
            title: "Intrusion Attempt",
            body: "Trying to overwrite somebody else's post",
            image_uri: null,
            status: "active",
          } satisfies IRedditCommunityPost.IUpdate,
        },
      );
    },
  );
}
