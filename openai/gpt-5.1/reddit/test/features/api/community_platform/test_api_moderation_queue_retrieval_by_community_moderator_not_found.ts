import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";

/**
 * Validate that an authenticated community moderator receives a not-found style
 * error when requesting a moderation queue by a UUID that does not exist.
 *
 * Business context:
 *
 * - Community moderators use moderation queues to triage and review reports.
 * - When a moderator queries a queue id that is not present in
 *   community_platform_moderation_queues, the API must not silently succeed or
 *   return unrelated data; instead, it must signal that the resource does not
 *   exist.
 *
 * Scenario steps:
 *
 * 1. Register a new community moderator through the public join endpoint (POST
 *    /auth/communityModerator/join) using a valid
 *    ICommunityPlatformCommunityModerator.IJoin payload.
 *
 *    - This returns an ICommunityPlatformCommunityModerator.IAuthorized object and
 *         implicitly configures the connection with a moderator Authorization
 *         token.
 * 2. Generate a random UUID value to serve as a nonexistent moderationQueueId.
 *
 *    - We do not create any queues, so this UUID should not map to any
 *         community_platform_moderation_queues.id row in the database.
 * 3. Call GET
 *    /communityPlatform/communityModerator/moderationQueues/{moderationQueueId}
 *    via
 *    api.functional.communityPlatform.communityModerator.moderationQueues.at
 *    using the authenticated moderator connection and the random UUID.
 * 4. Verify that the call fails with an HTTP error rather than returning a
 *    ICommunityPlatformModerationQueue object.
 *
 *    - Use TestValidator.error with an async callback that invokes the at()
 *         function.
 *    - Per global guidelines, do not assert a specific numeric status code (such as
 *         404); just ensure that an error is thrown.
 *
 * Validation focus:
 *
 * - Confirms that authenticated moderators do not receive phantom moderation
 *   queues for non-existent ids.
 * - Ensures the endpoint distinguishes between authentication failure and genuine
 *   resource absence, by running under a valid moderator session.
 */
export async function test_api_moderation_queue_retrieval_by_community_moderator_not_found(
  connection: api.IConnection,
) {
  // 1. Register a community moderator to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderator);

  // 2. Generate a random UUID that should not correspond to any existing moderation queue.
  const nonexistentQueueId = typia.random<string & tags.Format<"uuid">>();

  // 3 & 4. Attempt to fetch the nonexistent moderation queue and assert that it fails.
  await TestValidator.error(
    "non-existent moderation queue should result in error for community moderator",
    async () => {
      await api.functional.communityPlatform.communityModerator.moderationQueues.at(
        connection,
        { moderationQueueId: nonexistentQueueId },
      );
    },
  );
}
