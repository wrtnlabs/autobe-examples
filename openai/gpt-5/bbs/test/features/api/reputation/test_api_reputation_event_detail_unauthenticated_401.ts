import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";

/**
 * Ensure unauthenticated access to a specific reputation event is rejected.
 *
 * Purpose:
 *
 * - Validate authentication boundary for member-scoped reputation event detail.
 *
 * Steps:
 *
 * 1. Construct an unauthenticated connection (fresh headers object) to avoid any
 *    inherited auth tokens.
 * 2. Call GET /econDiscuss/member/users/{userId}/reputation/events/{eventId} with
 *    syntactically valid UUIDs for both path parameters.
 * 3. Expect 401 Unauthorized via TestValidator.httpError.
 *
 * Notes:
 *
 * - No data setup required because the request is expected to fail at the auth
 *   layer before resource lookup.
 */
export async function test_api_reputation_event_detail_unauthenticated_401(
  connection: api.IConnection,
) {
  // Create a guaranteed-unauthenticated connection without touching the original
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Expect 401 when unauthenticated
  await TestValidator.httpError(
    "unauthenticated user cannot access reputation event detail",
    401,
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.at(
        unauthConn,
        {
          userId: typia.random<string & tags.Format<"uuid">>(),
          eventId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
