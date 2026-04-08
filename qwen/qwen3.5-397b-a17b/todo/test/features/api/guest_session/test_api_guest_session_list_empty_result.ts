import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session list endpoint returns empty result for newly registered guest.
 *
 * Validates the edge case where a guest user has no session records to retrieve. After guest registration, immediately queries the session list endpoint without any prior session creation activities. Ensures the response returns a properly structured paginated result with an empty data array and correct pagination metadata.
 *
 * This test confirms the system handles the zero-record scenario gracefully and returns valid pagination structure even when no session history exists for the guest.
 *
 * 1. Register a new guest account using device fingerprint authentication.
 * 2. Create authenticated connection with the guest token.
 * 3. Call session list endpoint immediately after registration.
 * 4. Validate response structure with empty data array.
 * 5. Verify pagination metadata shows 0 records and 0 pages.
 */
export async function test_api_guest_session_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestAuth = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create authenticated guest connection
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${guestAuth.token.access}`,
    },
  };
  // 3. Query session list (should be empty for new guest)
  const result = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate empty data array
  TestValidator.equals("data array is empty", result.data, []);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 10);
  TestValidator.equals("total records", result.pagination.records, 0);
  TestValidator.equals("total pages", result.pagination.pages, 0);
}
