import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that platform-admin moderation queue read endpoint rejects
 * unauthenticated access.
 *
 * Business context:
 *
 * - Moderation queues are sensitive configuration objects that should only be
 *   visible to authenticated moderation actors such as platform
 *   administrators.
 * - The GET /communityPlatform/platformAdmin/moderationQueues/{moderationQueueId}
 *   endpoint is documented as requiring a moderation-capable actor.
 *
 * This test validates that an anonymous client (no Authorization header) cannot
 * fetch moderation queue details, even when a valid queue id exists.
 *
 * High-level steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 * 2. Using the authenticated connection, create a moderation queue via POST
 *    /communityPlatform/platformAdmin/moderationQueues and capture its id.
 * 3. Build a new unauthenticated connection object that shares the same host but
 *    has an empty headers object.
 * 4. Attempt to call GET
 *    /communityPlatform/platformAdmin/moderationQueues/{moderationQueueId} with
 *    the unauthenticated connection.
 * 5. Assert that this unauthenticated call fails using TestValidator.error,
 *    confirming that anonymous callers cannot see moderation queue details.
 */
export async function test_api_moderation_queue_retrieval_by_platform_admin_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authenticated session.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.community-platform.test/join",
    referrer: "https://community-platform.test/landing/platform-admin",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation queue as the authenticated platform admin.
  const createBody = {
    community_id: null,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    queue_type: "platform_severe",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdQueue);

  // 3. Build an unauthenticated connection that shares host/options but has empty headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to read the moderation queue using the unauthenticated connection
  //    and expect an error indicating lack of authentication/authorization.
  await TestValidator.error(
    "unauthenticated platform-admin moderation queue read must be rejected",
    async () => {
      await api.functional.communityPlatform.platformAdmin.moderationQueues.at(
        unauthenticatedConnection,
        {
          moderationQueueId: createdQueue.id,
        },
      );
    },
  );
}
