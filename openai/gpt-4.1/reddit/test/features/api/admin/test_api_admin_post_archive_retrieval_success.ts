import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostArchive";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an admin can retrieve an archival snapshot of a previously
 * created post.
 *
 * 1. Register a new admin and obtain authentication context.
 * 2. Create a new community for hosting posts.
 * 3. Post a new text post in the created community.
 * 4. (Simulate) Archive the post: since the actual archive function is not
 *    exposed, this is mocked via typia.random for test.
 * 5. Retrieve a post archive snapshot by admin.
 * 6. Validate that the returned snapshot matches expected content and audit
 *    attributes (archived_title, archived_body, archived_at, archived_reason,
 *    and actor/audit fields.) (Unauthorized access tests are described but not
 *    implemented due to a lack of public API for non-admin archive retrieval.)
 */
export async function test_api_admin_post_archive_retrieval_success(
  connection: api.IConnection,
) {
  // Register admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://platform.test.com/register",
    referrer: "https://platform.test.com/landing",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin registration email matches",
    adminAuth.email,
    adminInput.email,
  );

  // Create community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5, wordMin: 3 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityInput,
    });
  typia.assert(community);
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityInput.name,
  );

  // Create a text post
  const textBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });
  const postInput = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    text_body: textBody,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);
  TestValidator.equals("post title matches input", post.title, postInput.title);

  // Because we lack archive endpoints, simulate an archive snapshot for this post and retrieve it
  // (In real test, this would be produced by an archive API.)
  const archiveSim: ICommunityPlatformPostArchive = {
    id: typia.random<string & tags.Format<"uuid">>(),
    community_platform_post_id: post.id,
    archived_title: post.title,
    archived_body: textBody,
    archived_url: null,
    archived_image_uri: null,
    archived_reason: "Policy violation - simulated for test",
    archived_at: new Date().toISOString(),
    archived_by_user_id: adminAuth.id,
    archived_by_user: {
      id: adminAuth.id,
      display_name: adminAuth.display_name,
    },
  };
  typia.assert(archiveSim);

  // Retrieve post archive via admin endpoint
  const archive =
    await api.functional.communityPlatform.admin.posts.archives.at(connection, {
      postId: post.id,
      archiveId: archiveSim.id,
    });
  typia.assert(archive);

  // Validate the snapshot info
  TestValidator.equals(
    "archived post id matches",
    archive.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "archived post title matches",
    archive.archived_title,
    post.title,
  );
  TestValidator.equals(
    "archived body matches text",
    archive.archived_body,
    textBody,
  );
  TestValidator.equals(
    "archive actor id is admin",
    archive.archived_by_user_id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin summary id matches",
    archive.archived_by_user.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin summary display_name matches",
    archive.archived_by_user.display_name,
    adminAuth.display_name,
  );
  // Because links and image posts are not used, archived_url and archived_image_uri should be null
  TestValidator.equals("archived url is null", archive.archived_url, null);
  TestValidator.equals(
    "archived image uri is null",
    archive.archived_image_uri,
    null,
  );
  TestValidator.equals(
    "archived reason matches",
    archive.archived_reason,
    archiveSim.archived_reason,
  );
  // archived_at just checked for presence/format since we cannot guarantee value in mock
  TestValidator.predicate(
    "archived_at is non-empty ISO string",
    typeof archive.archived_at === "string" && archive.archived_at.length > 0,
  );
}
