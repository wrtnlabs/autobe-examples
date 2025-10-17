import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";

/**
 * Validate not-found behavior for owner-scoped reputation event detail.
 *
 * This test ensures that an authenticated member (the owner) receives an error
 * when requesting a reputation event by a non-existent eventId under their own
 * userId scope. Per framework rules, we assert that an error occurs without
 * validating a specific HTTP status code.
 *
 * Steps:
 *
 * 1. Register a member through /auth/member/join and obtain authenticated context
 *    (token is auto-attached by the SDK) and member id.
 * 2. Call GET /econDiscuss/member/users/{userId}/reputation/events/{eventId} using
 *    the owner’s userId and a random UUID for eventId that should not exist.
 * 3. Assert that an error is thrown (e.g., backend would return 404 Not Found).
 */
export async function test_api_reputation_event_detail_not_found_for_owner(
  connection: api.IConnection,
) {
  // 1) Register a member and obtain auth context
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!", // satisfies MinLength<8>
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Try to read a non-existent reputation event under the owner’s scope
  const missingEventId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "owner requesting non-existent reputation event should fail",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.at(
        connection,
        {
          userId: authorized.id,
          eventId: missingEventId,
        },
      );
    },
  );
}
