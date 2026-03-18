import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import type { IHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest to create initial session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create a new connection with the guest's authorization token
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    ...authConnection.headers,
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 3. Retrieve guest sessions list
  const sessionsList = await api.functional.hrms.guest.guest_sessions.index(
    authConnection,
    {
      body: {
        page: 1,
        page_size: 10,
      } satisfies IHrmsGuestSession.IRequest,
    },
  );
  typia.assert(sessionsList);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessionsList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessionsList.pagination.limit, 10);
  TestValidator.predicate(
    "total records at least 1",
    sessionsList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages valid",
    sessionsList.pagination.pages >= 1,
  );
  // 5. Validate data contains sessions
  TestValidator.equals("data length at least 1", sessionsList.data.length, 1);
  typia.assert(sessionsList.data[0]);
  // 6. Validate session structure
  const session = sessionsList.data[0];
  typia.assert(session);
  typia.assert(session.guest);
  TestValidator.predicate(
    "guest has device fingerprint",
    session.guest.device_fingerprint.length > 0,
  );
  TestValidator.predicate("session has valid IP", session.ip.length > 0);
  TestValidator.predicate("session has valid href", session.href.length > 0);
  TestValidator.predicate(
    "session has valid created_at",
    new Date(session.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "session has valid expired_at",
    new Date(session.expired_at).getTime() > 0,
  );
}
