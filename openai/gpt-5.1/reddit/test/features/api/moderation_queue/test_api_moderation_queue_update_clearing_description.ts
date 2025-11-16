import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_moderation_queue_update_clearing_description(
  connection: api.IConnection,
) {
  /**
   * Validate that a platform administrator can clear the optional description
   * field of an existing moderation queue.
   *
   * Business context: Platform administrators maintain moderation queues that
   * route reports and safety workloads. Queues have an optional free-text
   * `description` used as narrative metadata. This test ensures that once a
   * description has been set on a queue, an administrator can later remove it
   * entirely (set it to null) using the update endpoint, without disturbing
   * other configuration fields.
   *
   * Steps:
   *
   * 1. Register and authenticate a platform admin via POST
   *    /auth/platformAdmin/join.
   * 2. Create a moderation queue with a non-null description via POST
   *    /communityPlatform/platformAdmin/moderationQueues.
   * 3. Confirm the created queue has a non-null description and capture baseline
   *    id, created_at, and updated_at.
   * 4. Call PUT
   *    /communityPlatform/platformAdmin/moderationQueues/{moderationQueueId}
   *    with an ICommunityPlatformModerationQueue.IUpdate body that sets
   *    description explicitly to null.
   * 5. Verify that the update response:
   *
   *    - Has the same id as the original queue,
   *    - Has description === null,
   *    - Retains created_at,
   *    - And has updated_at advanced compared to the original.
   */

  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a moderation queue with a non-null description.
  const createBody = {
    community_id: null,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    queue_type: "platform_default",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformModerationQueue>(createdQueue);

  TestValidator.predicate(
    "created queue must have non-null description before clearing",
    createdQueue.description !== null &&
      createdQueue.description !== undefined &&
      createdQueue.description.length > 0,
  );

  const originalId = createdQueue.id;
  const originalCreatedAt = createdQueue.created_at;
  const originalUpdatedAt = createdQueue.updated_at;

  // 3. Update the queue to clear the description (set to null).
  const updateBody = {
    description: null,
  } satisfies ICommunityPlatformModerationQueue.IUpdate;

  const updatedQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.update(
      connection,
      {
        moderationQueueId: createdQueue.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(updatedQueue);

  // 4. Validate business expectations after update.
  TestValidator.equals(
    "queue id should remain unchanged after description clear",
    updatedQueue.id,
    originalId,
  );

  TestValidator.equals(
    "created_at should remain unchanged after description update",
    updatedQueue.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "description should be null after clearing",
    updatedQueue.description,
    null,
  );

  TestValidator.predicate(
    "updated_at should be greater than or equal to original updated_at",
    new Date(updatedQueue.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
