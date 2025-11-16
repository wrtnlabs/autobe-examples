import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can retrieve a global moderation
 * queue.
 *
 * Business context:
 *
 * - Platform administrators manage moderation queues that can be either
 *   community-scoped or platform-wide (global).
 * - Global queues are represented by a null `community_id` and are used for
 *   platform-level moderation workflows.
 *
 * Scenario Steps:
 *
 * 1. Register a new platform administrator using /auth/platformAdmin/join to
 *    obtain an authenticated connection.
 * 2. As that platform admin, create a global moderation queue via
 *    /communityPlatform/platformAdmin/moderationQueues with `community_id`
 *    explicitly set to null and valid configuration fields (name, queue_type,
 *    status, description).
 * 3. Retrieve the created moderation queue using
 *    /communityPlatform/platformAdmin/moderationQueues/{moderationQueueId}.
 * 4. Validate that:
 *
 *    - The queue id matches the created one.
 *    - `community_id` is null (indicating platform-wide scope).
 *    - Name, queue_type, status, and description are preserved.
 *    - Created_at and updated_at are present and well-formed ISO date-times, and
 *         created_at matches between create and retrieval.
 */
export async function test_api_moderation_queue_retrieval_by_platform_admin_for_global_queue(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish authenticated context.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a global moderation queue (community_id = null).
  const baseName = RandomGenerator.name(2);
  const queueName = `global-${baseName}`;

  const createBody = {
    community_id: null,
    name: queueName,
    queue_type: "platform_global_test",
    status: "active",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdQueue);

  // 3. Retrieve the same moderation queue by id.
  const retrievedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.at(
      connection,
      { moderationQueueId: createdQueue.id },
    );
  typia.assert(retrievedQueue);

  // 4. Business validations.
  // 4-1. ID consistency between created and retrieved queues.
  TestValidator.equals(
    "moderation queue id must match between create and get",
    retrievedQueue.id,
    createdQueue.id,
  );

  // 4-2. community_id must be null to represent a global queue.
  TestValidator.equals(
    "global moderation queue must have community_id null",
    retrievedQueue.community_id ?? null,
    null,
  );

  // 4-3. Configuration fields should be preserved.
  TestValidator.equals(
    "queue name should be preserved",
    retrievedQueue.name,
    createdQueue.name,
  );
  TestValidator.equals(
    "queue type should be preserved",
    retrievedQueue.queue_type,
    createdQueue.queue_type,
  );
  TestValidator.equals(
    "queue status should be preserved",
    retrievedQueue.status,
    createdQueue.status,
  );
  TestValidator.equals(
    "queue description should be preserved",
    retrievedQueue.description ?? null,
    createdQueue.description ?? null,
  );

  // 4-4. Timestamp consistency.
  TestValidator.equals(
    "created_at must match between created and retrieved queue",
    retrievedQueue.created_at,
    createdQueue.created_at,
  );

  // updated_at should be same or later; we just assert equality for simplicity,
  // as most implementations will not update between create and immediate read.
  TestValidator.equals(
    "updated_at should be consistent between create and get",
    retrievedQueue.updated_at,
    createdQueue.updated_at,
  );
}
