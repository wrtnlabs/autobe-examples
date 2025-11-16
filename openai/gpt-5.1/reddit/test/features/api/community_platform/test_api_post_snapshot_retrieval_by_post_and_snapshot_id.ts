import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate retrieval of a historical post snapshot by postId and snapshotId.
 *
 * Business context:
 *
 * - Platform administrators configure master data such as community visibility
 *   levels and post types.
 * - Member users create communities and posts under those configurations.
 * - Historical snapshots of posts are exposed through a public endpoint GET
 *   /communityPlatform/posts/{postId}/snapshots/{snapshotId}.
 *
 * Due to the limited SDK surface in this fixture (no post update or snapshot
 * listing endpoints), this test focuses on validating that the snapshot
 * retrieval endpoint:
 *
 * - Accepts well-formed UUID identifiers for postId and snapshotId.
 * - Returns a payload structurally conforming to ICommunityPlatformPostSnapshot.
 *
 * High-level steps:
 *
 * 1. Register a platform admin and create basic master data
 *
 *    - Create a community visibility level (e.g., "public").
 *    - Create a post type (e.g., "text").
 * 2. Register a member user and create a community using the configured visibility
 *    level.
 * 3. Create a text post in the community using the configured post type.
 * 4. Invoke the public snapshot retrieval endpoint with random UUIDs for postId
 *    and snapshotId.
 * 5. Validate the response type and basic invariants using typia.assert and
 *    TestValidator.
 */
export async function test_api_post_snapshot_retrieval_by_post_and_snapshot_id(
  connection: api.IConnection,
) {
  // 1. Platform admin registration
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: "Password!123",
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create community visibility level as platform admin
  const visibilityLevelCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityLevelCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create post type as platform admin
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user registration
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.example.com`,
    password: "Password!123",
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as member user
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Create a text post in the community as member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.predicate(
    "created post should belong to the created community",
    post.community.id === community.id,
  );
  TestValidator.predicate(
    "created post should use the created post type",
    post.postType.id === postType.id,
  );

  // 7. Retrieve a snapshot using random UUIDs (contract-level validation)
  const snapshotPostId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  const snapshot: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.posts.snapshots.at(connection, {
      postId: snapshotPostId,
      snapshotId,
    });

  // Validate full structure of snapshot
  typia.assert(snapshot);

  // Business-level invariants that do not depend on specific master data
  TestValidator.predicate(
    "snapshot title should be non-empty",
    snapshot.title.length > 0,
  );
  TestValidator.predicate(
    "snapshot community id is a non-empty uuid string",
    snapshot.community.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot author id is a non-empty uuid string",
    snapshot.author.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot post_type id is a non-empty uuid string",
    snapshot.post_type.id.length > 0,
  );
}
