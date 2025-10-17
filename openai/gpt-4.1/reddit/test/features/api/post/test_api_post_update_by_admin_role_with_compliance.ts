import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate admin-only update abilities for posts, with compliance enforcement
 *
 * This test executes the following workflow:
 *
 * 1. Register an admin and authenticate (acquire elevated permissions)
 * 2. Admin creates a new community to ensure ownership and resource
 * 3. Admin creates a post in the community as baseline for editing
 * 4. Admin updates the post content, title, and/or status (including status
 *    override)
 * 5. Confirms the update is successful and new data is reflected in the response
 * 6. Checks that audit fields (updated_at, status) reflect the update
 *
 * All operations are performed by the admin role; general member/edit window
 * limitations are skipped.
 */
export async function test_api_post_update_by_admin_role_with_compliance(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a platform admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a new community
  const createCommunityBody = {
    name: RandomGenerator.alphabets(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 7,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(community);

  // 3. Admin creates a post in the community
  const createPostBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.content({ paragraphs: 2 }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.admin.posts.create(
    connection,
    { body: createPostBody },
  );
  typia.assert(post);

  // 4. Admin updates the post's title, content_body, and status (simulate override)
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.content({ paragraphs: 3 }),
    status: "removed",
  } satisfies ICommunityPlatformPost.IUpdate;
  const updated = await api.functional.communityPlatform.admin.posts.update(
    connection,
    {
      postId: post.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 5. Validate that updated values are reflected
  TestValidator.equals(
    "updated post title matches",
    updated.title,
    updateBody.title,
  );
  TestValidator.equals(
    "updated post content_body matches",
    updated.content_body,
    updateBody.content_body,
  );
  TestValidator.equals(
    "updated post status matches",
    updated.status,
    updateBody.status,
  );

  // 6. Validate updated_at timestamp is newer
  TestValidator.predicate(
    "updated_at is later than or equal to created_at after edit",
    new Date(updated.updated_at).getTime() >=
      new Date(post.updated_at).getTime(),
  );
}
