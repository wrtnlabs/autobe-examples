import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_view_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration and authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create authenticated guest connection using token
  const authenticatedGuestConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedGuestConnection.headers = {
    ...authenticatedGuestConnection.headers,
    Authorization: guestAuth.token.access,
  };
  // 3. Fetch sessions for authenticated guest
  const sessions = await api.functional.hrmPlatform.guest.sessions.index(
    authenticatedGuestConnection,
    {
      body: {} satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 4. Validate pagination metadata for empty session list
  TestValidator.equals(
    "pagination current page",
    sessions.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessions.pagination.limit, 20);
  TestValidator.equals(
    "pagination total records",
    sessions.pagination.records,
    0,
  );
  TestValidator.equals("pagination total pages", sessions.pagination.pages, 0);
  // 5. Validate empty data array
  TestValidator.equals("sessions data array is empty", sessions.data, []);
  TestValidator.predicate(
    "sessions array length is zero",
    sessions.data.length === 0,
  );
}