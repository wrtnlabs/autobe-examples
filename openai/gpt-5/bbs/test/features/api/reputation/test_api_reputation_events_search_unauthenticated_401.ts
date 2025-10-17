import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEReputationEventSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReputationEventSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussReputationEvent";

/**
 * Authentication boundary: reputation events search requires a logged-in
 * member.
 *
 * Purpose
 *
 * - Ensure unauthenticated access to member-scoped reputation ledger search is
 *   rejected.
 *
 * Steps
 *
 * 1. Build an unauthenticated connection (empty headers) from the provided
 *    connection.
 * 2. Generate a syntactically valid UUID for path parameter userId.
 * 3. Prepare a minimal, valid IEconDiscussReputationEvent.IRequest payload.
 * 4. Invoke the search endpoint and assert that it throws using
 *    TestValidator.error.
 *
 * Notes
 *
 * - This test intentionally does not validate specific HTTP status codes; it only
 *   asserts that an error occurs when unauthenticated, which satisfies the
 *   authentication boundary requirement.
 */
export async function test_api_reputation_events_search_unauthenticated_401(
  connection: api.IConnection,
) {
  // 1) Build an unauthenticated connection without any headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Path parameter: valid UUID
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Minimal valid request body using precise DTO type (satisfies pattern)
  const requestBody = {
    page: 1,
    limit: 10,
    sortBy: "occurred_at",
    sortOrder: "desc",
  } satisfies IEconDiscussReputationEvent.IRequest;

  // 4) Expect an error for unauthenticated access
  await TestValidator.error(
    "unauthenticated user cannot search reputation events",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.search(
        unauthConn,
        { userId, body: requestBody },
      );
    },
  );
}
