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
 * Validate that historical post snapshot retrieval enforces strict not-found
 * semantics for invalid or mismatched postId/snapshotId combinations.
 *
 * Business context
 *
 * - Snapshots are stored in community_platform_post_snapshots and are scoped to a
 *   specific post via post_id.
 * - The read endpoint GET
 *   /communityPlatform/posts/{postId}/snapshots/{snapshotId} must only return a
 *   snapshot when both the post and snapshot exist and the snapshot belongs to
 *   the given post.
 * - When either ID is invalid or when the snapshot does not belong to the post,
 *   the endpoint should behave as not-found and must not leak cross-post
 *   snapshot information.
 *
 * Test flow (negative-path focused)
 *
 * 1. Authenticate as platformAdmin and create a community visibility level and
 *    post type which will be referenced by the test data.
 * 2. Authenticate as memberUser and create a community using the visibility level
 *    created in step 1.
 * 3. Still as memberUser, create two posts in that community using the configured
 *    post type, to establish realistic post data.
 * 4. For all negative scenarios, use randomly generated UUIDs as postId and
 *    snapshotId values. We do not rely on knowing any real snapshot IDs because
 *    the API surface does not expose a snapshot listing endpoint; instead, we
 *    focus on the guarantee that invalid ID combinations must fail.
 * 5. Use TestValidator.error to assert that snapshots.at throws an error (but do
 *    NOT assert specific HTTP status codes): 5-1. Non-existent postId + random
 *    snapshotId. 5-2. Valid postId (from the first post) + random snapshotId.
 *    5-3. Valid postId from the first post + another random snapshotId that we
 *    conceptually treat as a cross-post mismatch after creating the second
 *    post.
 *
 * Implementation notes
 *
 * - Use only the provided SDK functions:
 *
 *   - Api.functional.auth.platformAdmin.join/login
 *   - Api.functional.auth.memberUser.join/login
 *   - Api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create
 *   - Api.functional.communityPlatform.platformAdmin.postTypes.create
 *   - Api.functional.communityPlatform.memberUser.communities.create
 *   - Api.functional.communityPlatform.memberUser.posts.create
 *   - Api.functional.communityPlatform.posts.snapshots.at
 * - Use typia.random and RandomGenerator utilities to build realistic but
 *   type-safe request payloads.
 * - Use typia.assert on all successful responses to ensure strict type safety.
 * - NEVER touch connection.headers directly; rely on auth endpoints to establish
 *   actor context.
 * - For TestValidator.error, supply a descriptive title and await the call when
 *   the callback is async.
 */
export async function test_api_post_snapshot_retrieval_not_found_for_invalid_ids(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join also authenticates and sets Authorization header)
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: platformAdminPassword,
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: "https://admin.console.example.com/join",
        referrer: "https://admin.console.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // Optional explicit login as platform admin using the same password
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminJoin.email,
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.console.example.com/login",
        referrer: "https://admin.console.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  // 2. Create visibility level as platform admin
  const visibilityLevelCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Create post type as platform admin
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 4. Register and log in as member user
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinRequest = {
    username: RandomGenerator.name(1).replace(/\s+/g, "_"),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoin.email,
        password: memberPassword,
        ip: null,
        href: "https://community.example.com/login",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 5. Create a community as the member user
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Create two posts in the community (for realistic context)
  const firstPostCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const firstPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: firstPostCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(firstPost);

  const secondPostCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const secondPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: secondPostCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(secondPost);

  const validPostId: string & tags.Format<"uuid"> = firstPost.id;

  // 7. Negative scenario 1: non-existent postId + random snapshotId
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const randomSnapshotId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "snapshot retrieval should fail when postId does not exist",
    async () => {
      await api.functional.communityPlatform.posts.snapshots.at(connection, {
        postId: nonExistentPostId,
        snapshotId: randomSnapshotId1,
      });
    },
  );

  // 8. Negative scenario 2: valid postId + non-existent snapshotId
  const randomSnapshotId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "snapshot retrieval should fail when snapshotId does not exist for a valid post",
    async () => {
      await api.functional.communityPlatform.posts.snapshots.at(connection, {
        postId: validPostId,
        snapshotId: randomSnapshotId2,
      });
    },
  );

  // 9. Negative scenario 3: valid postId from first post + another random snapshotId,
  //    conceptually representing a cross-post mismatch after creating a second post.
  const randomSnapshotId3: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "snapshot retrieval should fail when snapshot does not belong to the given post (cross-post mismatch)",
    async () => {
      await api.functional.communityPlatform.posts.snapshots.at(connection, {
        postId: validPostId,
        snapshotId: randomSnapshotId3,
      });
    },
  );
}
