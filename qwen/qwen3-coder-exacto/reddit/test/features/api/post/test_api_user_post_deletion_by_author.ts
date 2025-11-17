import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_post_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create a user account
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "user" + RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name: "test_community_" + RandomGenerator.alphaNumeric(8),
    slug: "test-community-" + RandomGenerator.alphaNumeric(8),
    title: "Test Community",
    description: "A community for testing purposes",
    rules: "Be respectful and follow the code of conduct",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: "Test Post for Deletion",
    type: "text",
    body: "This is a test post that will be deleted by its author.",
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Verify the post exists by fetching it
  // Note: There's no specific endpoint to get a single post by ID in the provided API,
  // but we can verify it was created by checking the response above

  // Step 5: Delete the post using the erase endpoint
  await api.functional.communityForum.user.posts.erase(connection, {
    postId: post.id,
  });

  // Step 6: Verify that the post is deleted
  // Since there's no way to fetch the post again, we test that a second delete fails
  await TestValidator.error(
    "should not be able to delete the same post twice",
    async () => {
      await api.functional.communityForum.user.posts.erase(connection, {
        postId: post.id,
      });
    },
  );
}
