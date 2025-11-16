import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a platform administrator can create multiple moderation queues
 * with different initial `status` values and that these statuses are persisted
 * distinctly in the created queue records.
 *
 * Business context: Moderation queues determine how safety and abuse reports
 * are routed and surfaced to moderators. Platform administrators must be able
 * to create queues in different operational states (e.g., `"active"` and
 * `"paused"`) so that they can stage new queues before turning them on or
 * temporarily pause routing without deleting configuration.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Build a realistic ICommunityPlatformPlatformadmin.IJoin payload with random
 *         but valid values for username, email, password, displayName, href,
 *         and referrer, optionally setting ip.
 *    - Rely on the SDK to automatically attach the access token from the IAuthorized
 *         response onto connection.headers.Authorization.
 *    - Assert the join response type with typia.assert to ensure it matches
 *         ICommunityPlatformPlatformadmin.IAuthorized.
 * 2. Using the authenticated platformAdmin context, create the first moderation
 *    queue with status `"active"` using
 *    api.functional.communityPlatform.platformAdmin.moderationQueues.create.
 *
 *    - Build an ICommunityPlatformModerationQueue.ICreate body where:
 *
 *         - Community_id is omitted so it becomes a global/platform-wide queue.
 *         - Name is a deterministic, human-readable string like
 *                   "global-active-queue-<random-suffix>".
 *         - Queue_type is a non-empty string such as "platform_default_active".
 *         - Status is exactly "active".
 *         - Description is a descriptive sentence indicating that this queue is actively
 *                   routing reports.
 *    - Assert the response with typia.assert as ICommunityPlatformModerationQueue.
 *    - Capture id, status, name, queue_type, created_at, and updated_at.
 * 3. Still as the same admin, create a second moderation queue with status
 *    `"paused"`.
 *
 *    - Build another ICommunityPlatformModerationQueue.ICreate body with:
 *
 *         - Community_id omitted (global queue again).
 *         - Name different from the first queue, e.g.,
 *                   "global-paused-queue-<random-suffix>".
 *         - Queue_type a different string, such as "platform_escalated_paused".
 *         - Status exactly "paused".
 *         - Description clarifying that this queue is configured but not currently
 *                   routing new reports.
 *    - Call the same create API and assert the response with typia.assert.
 *    - Capture its id, status, name, queue_type, created_at, and updated_at.
 * 4. Perform business-level validations using TestValidator:
 *
 *    - Confirm that the two queue ids are not equal.
 *    - Confirm that the first queue's status is exactly "active" and the second
 *         queue's status is exactly "paused".
 *    - Confirm that the queue names differ.
 *    - Confirm that the queue_type of the two queues differ.
 *    - Confirm that created_at and updated_at for each queue are non-empty strings
 *         (trusting typia.assert for detailed date-time validation).
 * 5. No list/search API is available in the provided SDK materials for moderation
 *    queues, so the test limits itself to validating the direct create
 *    responses rather than performing a follow-up listing check.
 */
export async function test_api_moderation_queue_creation_with_initial_status_variations(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create first moderation queue with status "active".
  const activeSuffix = RandomGenerator.alphaNumeric(6);
  const activeCreateBody = {
    name: `global-active-queue-${activeSuffix}`,
    queue_type: "platform_default_active",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const activeQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: activeCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(activeQueue);

  // 3. Create second moderation queue with status "paused".
  const pausedSuffix = RandomGenerator.alphaNumeric(6);
  const pausedCreateBody = {
    name: `global-paused-queue-${pausedSuffix}`,
    queue_type: "platform_escalated_paused",
    status: "paused",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const pausedQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: pausedCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(pausedQueue);

  // 4. Business-level validations.
  TestValidator.notEquals(
    "moderation queue ids must be distinct",
    activeQueue.id,
    pausedQueue.id,
  );

  TestValidator.equals(
    "first queue status must be 'active'",
    activeQueue.status,
    "active",
  );

  TestValidator.equals(
    "second queue status must be 'paused'",
    pausedQueue.status,
    "paused",
  );

  TestValidator.notEquals(
    "queue names must differ between active and paused queues",
    activeQueue.name,
    pausedQueue.name,
  );

  TestValidator.notEquals(
    "queue_type values must differ between active and paused queues",
    activeQueue.queue_type,
    pausedQueue.queue_type,
  );

  TestValidator.predicate(
    "active queue created_at must be non-empty",
    activeQueue.created_at.length > 0,
  );

  TestValidator.predicate(
    "active queue updated_at must be non-empty",
    activeQueue.updated_at.length > 0,
  );

  TestValidator.predicate(
    "paused queue created_at must be non-empty",
    pausedQueue.created_at.length > 0,
  );

  TestValidator.predicate(
    "paused queue updated_at must be non-empty",
    pausedQueue.updated_at.length > 0,
  );
}
