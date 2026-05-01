import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering guest sessions by active status.
 *
 * Validates that the guest sessions list endpoint correctly filters sessions based on their active or expired status. An active session has an expiration timestamp in the future, while an expired session has passed its expiration time.
 *
 * The test authenticates as a guest to create a fresh active session, then queries the sessions list with the active filter set to true. It verifies that all returned sessions remain valid and that the newly created session appears in the filtered results.
 *
 * 1. Guest authenticates via join endpoint, creating a fresh active session.
 * 2. Guest queries sessions list with active filter set to true.
 * 3. Validates every returned session has expired_at in the future.
 * 4. Validates at least one active session exists in the results.
 * 5. Validates pagination metadata is consistent with the filtered data.
 */
export async function test_api_session_list_filter_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Query active sessions
  const result = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        active: true,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate all returned sessions are active
  const now = new Date();
  for (const session of result.data) {
    TestValidator.predicate(
      "session expired_at is in the future",
      new Date(session.expired_at) > now,
    );
  }
  // 4. Validate at least one active session exists
  TestValidator.predicate(
    "at least one active session found",
    result.data.length > 0,
  );
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination records count covers data length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "pagination pages count is consistent",
    result.pagination.pages >= 1,
  );
}
