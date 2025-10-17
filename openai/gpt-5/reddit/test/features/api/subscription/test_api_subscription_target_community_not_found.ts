import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Error handling: subscribing to a non-existent community should fail.
 *
 * Steps:
 *
 * 1. Register a new member user (join) using valid identifiers, password policy,
 *    and consent timestamps. The SDK sets the auth token automatically.
 * 2. Attempt to subscribe to a randomly generated UUID that should not match any
 *    existing community. Validate that the operation fails using
 *    TestValidator.error without asserting specific status codes.
 *
 * Notes:
 *
 * - Do not manipulate connection.headers; SDK manages auth.
 * - Use strict DTO typing with `satisfies` and typia.assert on non-void
 *   responses.
 */
export async function test_api_subscription_target_community_not_found(
  connection: api.IConnection,
) {
  // 1) Register (join) a new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    // Ensure password policy: length >= 8, contains letters and numbers
    password: `Aa${RandomGenerator.alphaNumeric(6)}1`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Try to subscribe to a non-existent community (random UUID)
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "subscribing to a non-existent community should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.subscribe.create(
        connection,
        { communityId: nonExistentCommunityId },
      );
    },
  );
}
