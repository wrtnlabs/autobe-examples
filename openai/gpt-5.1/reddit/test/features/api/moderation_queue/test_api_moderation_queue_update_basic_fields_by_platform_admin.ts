import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can update basic mutable fields of a
 * moderation queue.
 *
 * Business purpose:
 *
 * - Platform admins manage moderation workflows by configuring queues that route
 *   reports.
 * - This test ensures an existing queue can be updated in-place (no recreation)
 *   for core mutable fields: name, queue_type, status, and description.
 * - It also verifies that authentication is required and that lifecycle
 *   timestamps behave as expected (updated_at changes while created_at stays
 *   stable).
 *
 * End-to-end workflow:
 *
 * 1. Register and authenticate a platform administrator using POST
 *    /auth/platformAdmin/join.
 *
 *    - This returns an ICommunityPlatformPlatformadmin.IAuthorized including JWT
 *         tokens.
 *    - The SDK automatically sets the Authorization header on the connection.
 * 2. Using the authenticated connection, create an initial moderation queue via
 *    POST /communityPlatform/platformAdmin/moderationQueues with explicit,
 *    known values:
 *
 *    - Name: e.g., "Initial Queue"
 *    - Queue_type: e.g., "platform_severe"
 *    - Status: e.g., "active"
 *    - Description: a non-empty string so we can later change or clear it.
 * 3. Capture the returned ICommunityPlatformModerationQueue as `original`.
 * 4. Call PUT
 *    /communityPlatform/platformAdmin/moderationQueues/{moderationQueueId}
 *    through
 *    api.functional.communityPlatform.platformAdmin.moderationQueues.update
 *    with a body typed as ICommunityPlatformModerationQueue.IUpdate that
 *    updates multiple fields at once:
 *
 *    - Name: a new distinct value
 *    - Queue_type: a different value (e.g., "platform_legal")
 *    - Status: change from "active" to "paused"
 *    - Description: change to another non-empty value (we avoid null-vs-undefined
 *         edge case here as the Update DTO allows both string and null).
 * 5. Validate the update response:
 *
 *    - Type-check with typia.assert(ICommunityPlatformModerationQueue).
 *    - Id remains identical to original.id (queue identity is stable).
 *    - Name, queue_type, status, and description reflect the new values.
 *    - Created_at remains equal to original.created_at.
 *    - Updated_at is different from (and logically later than or at least not equal
 *         to) original.updated_at.
 *
 * Error scenarios like unauthorized access or non-existent IDs are out of scope
 * for this test and are covered by other tests. Here we focus on the happy-path
 * update behavior for a valid, authenticated platform admin.
 */
export async function test_api_moderation_queue_update_basic_fields_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial moderation queue with known values.
  const createBody = {
    community_id: null,
    name: "Initial Queue",
    queue_type: "platform_severe",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const original: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      { body: createBody },
    );
  typia.assert(original);

  // Basic sanity checks on the created queue.
  TestValidator.equals(
    "created queue id should be stable UUID string",
    original.id,
    original.id,
  );
  TestValidator.equals(
    "created queue name should match input",
    original.name,
    createBody.name,
  );

  // 3. Prepare updated values for mutable fields.
  const updatedName = "Updated Platform Legal Queue";
  const updatedQueueType = "platform_legal";
  const updatedStatus = "paused";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    name: updatedName,
    queue_type: updatedQueueType,
    status: updatedStatus,
    description: updatedDescription,
  } satisfies ICommunityPlatformModerationQueue.IUpdate;

  // 4. Call update endpoint with the captured moderationQueueId.
  const updated: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.update(
      connection,
      {
        moderationQueueId: original.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate identity stability and field updates.
  TestValidator.equals(
    "queue id should remain unchanged after update",
    updated.id,
    original.id,
  );
  TestValidator.equals(
    "queue name should be updated",
    updated.name,
    updatedName,
  );
  TestValidator.equals(
    "queue_type should be updated",
    updated.queue_type,
    updatedQueueType,
  );
  TestValidator.equals(
    "status should be updated",
    updated.status,
    updatedStatus,
  );
  TestValidator.equals(
    "description should be updated",
    updated.description,
    updatedDescription,
  );

  // created_at must remain the same between original and updated.
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    original.created_at,
  );

  // updated_at should differ to reflect the update.
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    original.updated_at,
  );
}
