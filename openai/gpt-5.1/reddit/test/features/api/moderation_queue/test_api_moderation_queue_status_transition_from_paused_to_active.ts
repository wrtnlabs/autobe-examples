import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a platform administrator can reactivate a paused moderation queue
 * by transitioning its status from "paused" to "active" while preserving
 * identifiers and creation timestamp, and updating the modification timestamp.
 *
 * Business flow validated by this test:
 *
 * 1. Register and authenticate a platform administrator using POST
 *    /auth/platformAdmin/join so that subsequent calls run with platformAdmin
 *    privileges.
 * 2. Create a global moderation queue via POST
 *    /communityPlatform/platformAdmin/moderationQueues with its status
 *    explicitly set to "paused".
 * 3. Capture the queue's id, community_id, created_at, and updated_at fields from
 *    the creation response.
 * 4. Reactivate the queue via PUT
 *    /communityPlatform/platformAdmin/moderationQueues/{moderationQueueId} by
 *    sending an update body that changes only the status field to "active" and
 *    adjusts the description to note reactivation.
 * 5. Validate that the update response:
 *
 *    - Keeps the same id and community_id values.
 *    - Has status equal to "active".
 *    - Preserves created_at.
 *    - Updates updated_at to a strictly later timestamp.
 */
export async function test_api_moderation_queue_status_transition_from_paused_to_active(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a moderation queue initially in "paused" status.
  const createBody = {
    community_id: null,
    name: `queue-${RandomGenerator.alphabets(8)}`,
    queue_type: "platform_default",
    status: "paused",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(createdQueue);

  const originalId = createdQueue.id;
  const originalCommunityId = createdQueue.community_id ?? null;
  const originalCreatedAt = createdQueue.created_at;
  const originalUpdatedAt = createdQueue.updated_at;
  const originalDescription = createdQueue.description ?? null;

  // Sanity check: initial status is paused.
  TestValidator.equals(
    "initial moderation queue status should be paused",
    createdQueue.status,
    "paused",
  );

  // 3. Reactivate the queue by updating status to "active" and tweaking description.
  const reactivatedDescription =
    "Reactivated queue: " + RandomGenerator.paragraph({ sentences: 3 });

  const updateBody = {
    status: "active",
    description: reactivatedDescription,
  } satisfies ICommunityPlatformModerationQueue.IUpdate;

  const updatedQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.update(
      connection,
      {
        moderationQueueId: originalId,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(updatedQueue);

  // 4. Validate identifiers and scope remain unchanged.
  TestValidator.equals(
    "queue id should remain unchanged after status transition",
    updatedQueue.id,
    originalId,
  );

  TestValidator.equals(
    "community_id should remain unchanged after status transition",
    updatedQueue.community_id ?? null,
    originalCommunityId,
  );

  // 5. Validate status has transitioned to active.
  TestValidator.equals(
    "moderation queue status should transition to active",
    updatedQueue.status,
    "active",
  );

  // 6. created_at must be preserved.
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedQueue.created_at,
    originalCreatedAt,
  );

  // 7. updated_at must be strictly greater than the previous updated_at.
  TestValidator.predicate(
    "updated_at should be strictly later than original updated_at",
    () => updatedQueue.updated_at > originalUpdatedAt,
  );

  // 8. Description should reflect the reactivation change.
  TestValidator.notEquals(
    "description should change when reactivating queue",
    updatedQueue.description ?? null,
    originalDescription,
  );
}
