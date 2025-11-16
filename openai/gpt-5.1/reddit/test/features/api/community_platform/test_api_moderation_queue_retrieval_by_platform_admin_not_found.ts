import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_moderation_queue_retrieval_by_platform_admin_not_found(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Generate a random UUID for a moderation queue that should not exist
  const nonexistentModerationQueueId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. As authenticated platform admin, attempt to retrieve the nonexistent moderation queue
  // 4. Verify that calling the endpoint results in an error (e.g., 404 Not Found),
  //    without asserting the specific HTTP status code according to global rules.
  await TestValidator.error(
    "non-existent moderation queue should throw error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.moderationQueues.at(
        connection,
        {
          moderationQueueId: nonexistentModerationQueueId,
        },
      );
    },
  );
}
