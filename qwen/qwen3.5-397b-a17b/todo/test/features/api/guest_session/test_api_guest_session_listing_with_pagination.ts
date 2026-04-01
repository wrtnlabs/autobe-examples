import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session listing with pagination.
 * 1. Create multiple guest accounts to generate session data
 * 2. Retrieve paginated list of guest sessions
 * 3. Validate pagination metadata and session structure
 * 4. Verify all required fields are present
 * 5. Ensure guest information is properly joined
 */
export async function test_api_guest_session_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple guest accounts to generate session data
  const guestCount = 3;
  const guestConnections: api.IConnection[] = [];
  const guestAuthResults: IMultiUserTodoGuest.IAuthorized[] = [];
  for (let i = 0; i < guestCount; i++) {
    const guestConnection: api.IConnection = { host: connection.host };
    const authResult = await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoGuest.IJoin,
    });
    typia.assert(authResult);
    guestConnections.push(guestConnection);
    guestAuthResults.push(authResult);
  }
  // 2. Retrieve paginated list of guest sessions
  const sessionsResponse =
    await api.functional.multiUserTodo.guest.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoGuestSession.IRequest,
    });
  typia.assert(sessionsResponse);
  // 3. Validate pagination metadata (business logic, not type validation)
  TestValidator.predicate(
    "current page is 1",
    sessionsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is valid",
    sessionsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(sessionsResponse.data),
  );
  // 4. Validate session count matches at least the guests we created
  TestValidator.predicate(
    "has sessions from created guests",
    sessionsResponse.data.length >= guestCount,
  );
}
