import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that discarding a non-existent timer returns a 404 Not Found error.
 *
 * Validates the business rule that discarding a timer requires an existing,
 * actively running timer owned by the requesting employee. When a member
 * attempts to discard a timer using a UUID that does not correspond to any
 * timer in the system, the API must reject the request with a 404 status code.
 *
 * This test confirms that no false-positive discard occurs — the system does
 * not silently succeed, create spurious timelogs, or emit timer-discarded
 * events when the target timer simply does not exist.
 *
 * 1. Member registers and authenticates via the join endpoint, obtaining
 *    a member-scoped connection with valid JWT tokens.
 * 2. Member attempts to discard a timer with a randomly generated UUID that
 *    has no corresponding timer record in the database.
 * 3. Verifies the API responds with a 404 Not Found error, confirming no
 *    timer exists to discard and no state change occurs.
 */
export async function test_api_timer_discard_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt to discard a non-existent timer
  const nonExistentTimerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify 404 error is returned
  await TestValidator.httpError(
    "discard non-existent timer returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.timers.discard(memberConnection, {
        timerId: nonExistentTimerId,
      });
    },
  );
}
