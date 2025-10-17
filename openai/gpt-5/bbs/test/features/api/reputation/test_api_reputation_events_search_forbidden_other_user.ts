import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEReputationEventSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReputationEventSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussReputationEvent";

/**
 * Deny cross-user reputation ledger search (owner-only access).
 *
 * This test ensures that a member cannot query another user’s reputation
 * events. We:
 *
 * 1. Register userB first.
 * 2. Register userA second so the connection holds userA's token (SDK-managed).
 * 3. With userA’s auth context, call the reputation events search targeting
 *    userId=userB.id using a valid pagination payload.
 * 4. Expect the operation to fail (authorization denial). We assert only that an
 *    error occurs, without checking specific HTTP status codes.
 */
export async function test_api_reputation_events_search_forbidden_other_user(
  connection: api.IConnection,
) {
  // 1) Register userB
  const userBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const userB = await api.functional.auth.member.join(connection, {
    body: userBJoinBody,
  });
  typia.assert(userB);

  // 2) Register userA (connection Authorization switches to userA via SDK)
  const userAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const userA = await api.functional.auth.member.join(connection, {
    body: userAJoinBody,
  });
  typia.assert(userA);

  // 3) Build a valid search request body
  const requestBody = {
    page: 1,
    limit: 10,
    sortBy: "occurred_at",
    sortOrder: "desc",
  } satisfies IEconDiscussReputationEvent.IRequest;

  // 4) Attempt cross-user search (userA -> userB ledger): must be denied
  await TestValidator.error(
    "forbid cross-user reputation search with another user's id",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.search(
        connection,
        {
          userId: userB.id,
          body: requestBody,
        },
      );
    },
  );
}
