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
 * Authentication boundary for member reputation events listing.
 *
 * Verifies that an unauthenticated client cannot list the current member's
 * reputation events. Uses a minimal yet valid pagination-and-sorting request
 * body and expects the call to be rejected when no Authorization context is
 * present.
 *
 * Steps
 *
 * 1. Prepare an unauthenticated connection (clone given connection with empty
 *    headers)
 * 2. Build IEconDiscussReputationEvent.IRequest body (page=1, limit=10,
 *    occurred_at desc)
 * 3. Call PATCH /econDiscuss/member/me/reputation/events with the unauthenticated
 *    connection
 * 4. Assert that an error occurs (do not assert specific status codes)
 *
 * Note: Success path under authenticated context is intentionally omitted
 * because authentication APIs are not provided in the current materials.
 */
export async function test_api_member_reputation_events_authentication_boundary(
  connection: api.IConnection,
) {
  // 1) Prepare an unauthenticated connection - never manipulate headers afterward
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Build a minimal, valid request body
  const body = {
    page: 1,
    limit: 10,
    sortBy: "occurred_at" as const,
    sortOrder: "desc" as const,
  } satisfies IEconDiscussReputationEvent.IRequest;

  // 3) Call the endpoint without authentication and 4) expect an error
  await TestValidator.error(
    "unauthenticated member reputation events listing should be rejected",
    async () => {
      await api.functional.econDiscuss.member.me.reputation.events.index(
        unauthConn,
        { body },
      );
    },
  );
}
