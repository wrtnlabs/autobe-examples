import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate updating of a community-scoped moderation queue configuration.
 *
 * Business goal: Ensure that when a platform administrator updates a moderation
 * queue that is scoped to a specific community (via community_id), the queue
 * remains bound to that community and only its mutable configuration fields
 * change. Also validate that the updated_at timestamp is advanced to reflect
 * the modification.
 *
 * High-level steps:
 *
 * 1. Register and authenticate a platform administrator.
 * 2. Create a visibility level master record for communities.
 * 3. Register and authenticate a member user.
 * 4. As the member user, create a community using the created visibility level's
 *    code.
 * 5. Switch back to the platform admin and create a membership for that community
 *    and the member user.
 * 6. As the platform admin, create a moderation queue scoped to the community by
 *    setting community_id.
 * 7. Capture the original moderation queue fields (id, community_id, name, status,
 *    description, updated_at).
 * 8. Call the update endpoint with a payload that changes name, status, and
 *    description.
 * 9. Verify that:
 *
 *    - Id is unchanged.
 *    - Community_id is unchanged (still the same community's id).
 *    - Name, status, and description match the new values supplied.
 *    - Updated_at is strictly later than the original updated_at.
 */
export async function test_api_moderation_queue_update_for_community_scoped_queue(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // The SDK has already set Authorization header for platformAdmin via join.

  // 2. Create a visibility level master record
  const visibilityCode = "public-" + RandomGenerator.alphaNumeric(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Member join sets Authorization header for memberUser actor.

  // 4. As member user, create a community using the created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Switch back to platform admin and create a membership for that community
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.local/login",
      referrer: "https://admin.console.local/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 6. As platform admin, create a moderation queue scoped to the community
  const initialQueueName = `Queue for ${community.identifier}`;
  const initialQueueStatus = "active";
  const initialQueueDescription =
    "Initial moderation queue for community " + community.identifier;

  const moderationQueueCreateBody = {
    community_id: community.id,
    name: initialQueueName,
    queue_type: "community_default",
    status: initialQueueStatus,
    description: initialQueueDescription,
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      { body: moderationQueueCreateBody },
    );
  typia.assert(createdQueue);

  // Capture original fields for comparison
  const originalId = createdQueue.id;
  const originalCommunityId = createdQueue.community_id;
  const originalName = createdQueue.name;
  const originalStatus = createdQueue.status;
  const originalDescription = createdQueue.description ?? null;
  const originalUpdatedAt = createdQueue.updated_at;

  // Sanity checks: ensure queue is community-scoped and fields match creation
  TestValidator.equals(
    "created queue should have expected community_id",
    createdQueue.community_id,
    community.id,
  );
  TestValidator.equals(
    "created queue name matches initial name",
    createdQueue.name,
    initialQueueName,
  );
  TestValidator.equals(
    "created queue status matches initial status",
    createdQueue.status,
    initialQueueStatus,
  );
  TestValidator.equals(
    "created queue description matches initial description",
    createdQueue.description ?? null,
    initialQueueDescription,
  );

  // 7. Prepare update payload with new mutable values
  const updatedName = `${initialQueueName} (v2)`;
  const updatedStatus = "paused";
  const updatedDescription =
    "Updated description for moderation queue of community " +
    community.identifier;

  const updateBody = {
    name: updatedName,
    status: updatedStatus,
    description: updatedDescription,
  } satisfies ICommunityPlatformModerationQueue.IUpdate;

  // 8. Call update endpoint
  const updatedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.update(
      connection,
      {
        moderationQueueId: createdQueue.id,
        body: updateBody,
      },
    );
  typia.assert(updatedQueue);

  // 9. Verify invariants and updated fields
  TestValidator.equals(
    "queue id remains unchanged after update",
    updatedQueue.id,
    originalId,
  );

  TestValidator.equals(
    "community_id remains bound to original community",
    updatedQueue.community_id,
    originalCommunityId,
  );

  TestValidator.equals(
    "queue name is updated as requested",
    updatedQueue.name,
    updatedName,
  );

  TestValidator.equals(
    "queue status is updated as requested",
    updatedQueue.status,
    updatedStatus,
  );

  TestValidator.equals(
    "queue description is updated as requested",
    updatedQueue.description ?? null,
    updatedDescription,
  );

  // Compare updated_at timestamps lexicographically as ISO 8601 strings
  const updatedAtAfter = updatedQueue.updated_at;
  TestValidator.predicate(
    "updated_at must be later than original updated_at",
    new Date(updatedAtAfter).getTime() > new Date(originalUpdatedAt).getTime(),
  );
}
