import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of moderation queues with and without optional description.
 *
 * Business context:
 *
 * - Only platform administrators (platformAdmin actor) may create moderation
 *   queues.
 * - Moderation queues have an optional `description` field that may be present as
 *   a string, null, or omitted entirely in the creation DTO.
 * - This test ensures that the `description` field is persisted exactly as
 *   submitted when creating global (platform-wide) moderation queues, while
 *   core required fields remain intact.
 *
 * Steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Use typia.random<ICommunityPlatformPlatformadmin.IJoin>() to generate a valid
 *         join payload.
 *    - The SDK automatically attaches the admin access token to the connection
 *         headers, authenticating subsequent requests as this platform admin.
 * 2. Create a global moderation queue WITH a non-null description.
 *
 *    - Call POST /communityPlatform/platformAdmin/moderationQueues with a body
 *         satisfying ICommunityPlatformModerationQueue.ICreate.
 *    - Omit community_id so the queue is global.
 *    - Set description to a known non-empty string.
 *    - Assert that the response type is ICommunityPlatformModerationQueue and that
 *         name, queue_type, status, and description all match the request.
 * 3. Create another global moderation queue WITHOUT a description (explicit null).
 *
 *    - Call the same create endpoint again with a different name/queue_type to avoid
 *         uniqueness conflicts on (community_id, name).
 *    - Explicitly set description: null in the request body.
 *    - Assert that the response description is null and other fields match the
 *         request.
 * 4. Cross-check that the two queues are distinct records.
 *
 *    - Use TestValidator.notEquals to verify that their IDs differ.
 */
export async function test_api_moderation_queue_creation_with_and_without_description(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a global moderation queue WITH a non-null description
  const firstQueueRequest = {
    name: "global_queue_with_description",
    queue_type: "platform_default",
    status: "active",
    description: "Global moderation queue with detailed description",
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const firstQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: firstQueueRequest,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(firstQueue);

  TestValidator.equals(
    "first queue name matches request",
    firstQueue.name,
    firstQueueRequest.name,
  );
  TestValidator.equals(
    "first queue type matches request",
    firstQueue.queue_type,
    firstQueueRequest.queue_type,
  );
  TestValidator.equals(
    "first queue status matches request",
    firstQueue.status,
    firstQueueRequest.status,
  );
  TestValidator.equals(
    "first queue description matches request",
    firstQueue.description,
    firstQueueRequest.description,
  );

  // 3. Create another global moderation queue WITHOUT description (explicit null)
  const secondQueueRequest = {
    name: "global_queue_without_description",
    queue_type: "platform_secondary",
    status: "active",
    description: null,
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const secondQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: secondQueueRequest,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(secondQueue);

  TestValidator.equals(
    "second queue name matches request",
    secondQueue.name,
    secondQueueRequest.name,
  );
  TestValidator.equals(
    "second queue type matches request",
    secondQueue.queue_type,
    secondQueueRequest.queue_type,
  );
  TestValidator.equals(
    "second queue status matches request",
    secondQueue.status,
    secondQueueRequest.status,
  );
  TestValidator.equals(
    "second queue description is null as requested",
    secondQueue.description,
    secondQueueRequest.description,
  );

  // 4. Ensure the two queues are distinct records
  TestValidator.notEquals(
    "two moderation queues should have different IDs",
    firstQueue.id,
    secondQueue.id,
  );
}
