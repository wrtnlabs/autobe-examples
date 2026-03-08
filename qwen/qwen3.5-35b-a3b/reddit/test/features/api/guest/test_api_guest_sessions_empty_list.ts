import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest account with zero existing sessions
  const guestConnection: api.IConnection = { host: connection.host };
  const guest: IRedditPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(1),
        bio: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformGuest.IJoin,
    },
  );
  typia.assert(guest);
  // 2. Create authenticated connection with guest token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...guestConnection.headers,
      Authorization: guest.token.access,
    },
  };
  // 3. Request guest sessions list immediately (no other API calls made)
  const response: IPageIRedditPlatformMemberSession.ISummary =
    await api.functional.redditPlatform.guest.sessions.index(
      authenticatedConnection,
      {
        body: {} satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate empty data array
  TestValidator.equals("sessions list is empty", response.data.length, 0);
  // 5. Validate pagination metadata
  TestValidator.equals("total records is zero", response.pagination.records, 0);
  TestValidator.equals("total pages is zero", response.pagination.pages, 0);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is used", response.pagination.limit, 100);
}
