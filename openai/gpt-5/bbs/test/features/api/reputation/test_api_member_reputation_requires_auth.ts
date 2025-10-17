import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussUserReputation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserReputation";

export async function test_api_member_reputation_requires_auth(
  connection: api.IConnection,
) {
  /**
   * Validate that the member reputation endpoint rejects unauthenticated
   * access.
   *
   * Business context:
   *
   * - The endpoint returns the caller's reputation aggregate, and it must be
   *   protected. Unauthenticated requests must not retrieve any data.
   *
   * Steps:
   *
   * 1. Build an unauthenticated connection (fresh headers object).
   * 2. If SDK is in simulate mode, the call will return mock data regardless of
   *    auth — assert the DTO and exit (contract check only).
   * 3. Otherwise, assert that an unauthenticated call fails without checking a
   *    specific HTTP status code (generic error expectation).
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  if (unauthConn.simulate === true) {
    // Simulation mode bypasses authentication to return random mock data.
    const output =
      await api.functional.econDiscuss.member.me.reputation.at(unauthConn);
    typia.assert(output);
    await TestValidator.predicate(
      "simulation mode: contract validated despite no auth",
      async () => true,
    );
    return;
  }

  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      await api.functional.econDiscuss.member.me.reputation.at(unauthConn);
    },
  );
}
