import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussReputationEvent";

export async function test_api_reputation_events_index_unauthenticated_401(
  connection: api.IConnection,
) {
  /**
   * Verify that unauthenticated requests to the reputation events listing are
   * rejected with 401.
   *
   * Steps:
   *
   * 1. Build an unauthenticated connection (empty headers).
   * 2. Call GET /econDiscuss/member/users/{userId}/reputation/events with a valid
   *    UUID.
   * 3. Expect 401 Unauthorized via TestValidator.httpError.
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const userId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "unauthenticated listing of reputation events must return 401",
    401,
    async () => {
      return await api.functional.econDiscuss.member.users.reputation.events.index(
        unauthConn,
        { userId },
      );
    },
  );
}
