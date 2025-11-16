import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of a global (platform-wide) moderation queue by a newly
 * registered platform administrator.
 *
 * Business context:
 *
 * - Platform administrators can configure moderation queues that route safety and
 *   abuse reports.
 * - A moderation queue with community_id = null represents a global /
 *   platform-wide queue instead of being scoped to a single community.
 * - Only authenticated platformAdmin actors are allowed to call the moderation
 *   queue creation endpoint.
 *
 * Scenario steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join using
 *    api.functional.auth.platformAdmin.join.
 * 2. Rely on the SDK to attach the returned JWT access token to the connection
 *    (Authorization header) so subsequent platformAdmin calls are
 *    authenticated.
 * 3. Call POST /communityPlatform/platformAdmin/moderationQueues using
 *    api.functional.communityPlatform.platformAdmin.moderationQueues.create
 *    with an ICommunityPlatformModerationQueue.ICreate body that sets
 *    community_id to null, indicating a global/platform-wide queue.
 * 4. Provide concrete values for required fields: name, queue_type, status, and an
 *    optional description string.
 * 5. Validate the response ICommunityPlatformModerationQueue:
 *
 *    - Id is present (UUID, verified by typia.assert)
 *    - Community_id is null, confirming global scope
 *    - Name, queue_type, status, description match the request body
 *    - Created_at and updated_at are populated ISO date-time strings (enforced by
 *         typia.assert, additionally asserted as truthy).
 *
 * Note: The scenario draft mentions optionally re-reading the created queue via
 * a GET endpoint, but such a read API is not provided in the current SDK
 * function list, so this test limits itself to the create response.
 */
export async function test_api_moderation_queue_creation_global_platform_scope(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join)
  const joinBody = {
    username: RandomGenerator.name(1),
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

  // Basic sanity checks on the authorized admin payload
  TestValidator.predicate(
    "platform admin id should be truthy",
    admin.id.length > 0,
  );
  TestValidator.equals(
    "platform admin username should match join payload",
    admin.username,
    joinBody.username,
  );
  TestValidator.equals(
    "platform admin email should match join payload",
    admin.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "platform admin token.access should be non-empty",
    admin.token.access.length > 0,
  );

  // 2. Create a global/platform-wide moderation queue
  const queueCreateBody = {
    community_id: null,
    name: RandomGenerator.name(2),
    queue_type: "platform_severe",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: queueCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationQueue>(createdQueue);

  // 3. Validate that the moderation queue was created as global
  TestValidator.predicate(
    "created moderation queue id should be truthy",
    createdQueue.id.length > 0,
  );

  // community_id must be null for a global/platform-wide queue
  TestValidator.equals(
    "global moderation queue should have null community_id",
    createdQueue.community_id ?? null,
    null,
  );

  // Core configuration fields must match the create payload
  TestValidator.equals(
    "moderation queue name should match create payload",
    createdQueue.name,
    queueCreateBody.name,
  );
  TestValidator.equals(
    "moderation queue queue_type should match create payload",
    createdQueue.queue_type,
    queueCreateBody.queue_type,
  );
  TestValidator.equals(
    "moderation queue status should match create payload",
    createdQueue.status,
    queueCreateBody.status,
  );
  TestValidator.equals(
    "moderation queue description should match create payload",
    createdQueue.description ?? null,
    queueCreateBody.description ?? null,
  );

  // created_at and updated_at must be populated (typia.assert already
  // ensures they are valid date-time strings)
  TestValidator.predicate(
    "moderation queue created_at should be a non-empty string",
    createdQueue.created_at.length > 0,
  );
  TestValidator.predicate(
    "moderation queue updated_at should be a non-empty string",
    createdQueue.updated_at.length > 0,
  );
}
