import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that administrators can create posts in any community regardless of
 * posting permission restrictions.
 *
 * This test validates the administrator's platform-wide elevated privileges by
 * creating a community with restrictive posting permissions (such as
 * moderators_only or approved_only), then verifying that an administrator can
 * successfully create posts in that community despite the restrictions.
 *
 * Test workflow:
 *
 * 1. Create a member account to establish a community owner
 * 2. Create a community with restrictive posting permissions that would normally
 *    prevent most users from posting
 * 3. Create an administrator account with platform-wide elevated privileges
 * 4. Administrator creates a post in the restricted community, bypassing the
 *    permission checks
 * 5. Validate that the post was successfully created despite the restrictive
 *    community settings
 */
export async function test_api_post_creation_administrator_override_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to own the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community with restrictive posting permissions
  const restrictivePermissions = ["moderators_only", "approved_only"] as const;
  const selectedPermission = RandomGenerator.pick(restrictivePermissions);

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        posting_permission: selectedPermission,
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals(
    "community has restrictive posting permission",
    community.posting_permission,
    selectedPermission,
  );

  // Step 3: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 4: Administrator creates a post in the restricted community
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);

  const postData = {
    community_id: community.id,
    type: postType,
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body:
      postType === "text"
        ? typia.random<string & tags.MaxLength<40000>>()
        : undefined,
    url:
      postType === "link"
        ? typia.random<string & tags.MaxLength<2000>>()
        : undefined,
    image_url: postType === "image" ? typia.random<string>() : undefined,
    caption:
      postType === "image"
        ? typia.random<string & tags.MaxLength<10000>>()
        : undefined,
  } satisfies IRedditLikePost.ICreate;

  const adminPost: IRedditLikePost =
    await api.functional.redditLike.admin.posts.create(connection, {
      body: postData,
    });
  typia.assert(adminPost);

  // Step 5: Validate the post was successfully created
  TestValidator.equals("post type matches", adminPost.type, postType);
  TestValidator.equals("post title matches", adminPost.title, postData.title);
}
