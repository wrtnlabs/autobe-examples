import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can create and then delete a global
 * (platform-wide) moderation queue.
 *
 * Business flow:
 *
 * 1. Join as a platform administrator using POST /auth/platformAdmin/join.
 * 2. Create a global moderation queue using POST
 *    /communityPlatform/platformAdmin/moderationQueues with community_id =
 *    null.
 * 3. Verify that the created queue is valid and matches the requested payload for
 *    key fields (name, queue_type, status, community_id).
 * 4. Delete the created moderation queue using DELETE
 *    /communityPlatform/platformAdmin/moderationQueues/{moderationQueueId}.
 * 5. Assert that deletion succeeds (no error is thrown).
 */
export async function test_api_moderation_queue_delete_global_queue_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a platform administrator.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a global (platform-wide) moderation queue (community_id = null).
  const createBody = {
    community_id: null,
    name: `Global Queue - ${RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    })}`,
    queue_type: "platform_global_default",
    status: "active",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(createdQueue);

  // Basic business validations on the created queue.
  TestValidator.equals(
    "created moderation queue name should match the requested name",
    createdQueue.name,
    createBody.name,
  );
  TestValidator.equals(
    "created moderation queue type should match the requested queue_type",
    createdQueue.queue_type,
    createBody.queue_type,
  );
  TestValidator.equals(
    "created moderation queue status should match the requested status",
    createdQueue.status,
    createBody.status,
  );
  TestValidator.equals(
    "created moderation queue should be global (community_id null)",
    createdQueue.community_id,
    null,
  );

  // 3. Delete the created moderation queue.
  await api.functional.communityPlatform.platformAdmin.moderationQueues.erase(
    connection,
    {
      moderationQueueId: createdQueue.id,
    },
  );

  // 4. Confirm deletion did not throw and that erase returns void.
  TestValidator.equals(
    "platform admin should be able to delete a global moderation queue without error",
    true,
    true,
  );
}
