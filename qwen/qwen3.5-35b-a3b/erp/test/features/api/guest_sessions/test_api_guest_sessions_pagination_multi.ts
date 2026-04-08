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

export async function test_api_guest_sessions_pagination_multi(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guest: IHrmPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformGuest.IJoin,
    },
  );
  typia.assert(guest);
  // Create guest connection with token for subsequent calls
  const guestSessionConnection: api.IConnection = { host: connection.host };
  guestSessionConnection.headers = {
    Authorization: guest.token.access,
  };
  // 2. Test pagination with default limit
  const page1Result = await api.functional.hrmPlatform.guest.sessions.index(
    guestSessionConnection,
    {
      body: {} satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(page1Result);
  // 3. Test pagination with explicit limit
  const page2Limit10Result =
    await api.functional.hrmPlatform.guest.sessions.index(
      guestSessionConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformMemberSession.IRequest,
      },
    );
  typia.assert(page2Limit10Result);
  // 4. Test pagination with page 2
  const page2Result = await api.functional.hrmPlatform.guest.sessions.index(
    guestSessionConnection,
    {
      body: {
        page: 2,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(page2Result);
  // 5. Test pagination beyond available data
  const page100Result = await api.functional.hrmPlatform.guest.sessions.index(
    guestSessionConnection,
    {
      body: {
        page: 100,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(page100Result);
  // 6. Validate pagination metadata consistency
  TestValidator.equals("page1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page1 limit", page1Result.pagination.limit, 20); // default
  TestValidator.equals(
    "page1 records",
    page1Result.pagination.records,
    page1Result.data.length,
  );
  TestValidator.equals(
    "page1 pages calculation",
    page1Result.pagination.pages,
    page1Result.pagination.records === 0
      ? 0
      : Math.ceil(
          page1Result.pagination.records / page1Result.pagination.limit,
        ),
  );
  // 7. Validate page 2 results
  TestValidator.equals("page2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page2 limit", page2Result.pagination.limit, 20); // default
  TestValidator.predicate(
    "page 2 has fewer or equal records than page 1",
    page2Result.data.length <= page1Result.data.length,
  );
  // 8. Validate beyond available data returns empty
  TestValidator.equals("page 100 data empty", page100Result.data.length, 0);
  TestValidator.equals(
    "page 100 current",
    page100Result.pagination.current,
    100,
  );
  TestValidator.equals(
    "page 100 records",
    page100Result.pagination.records,
    page1Result.pagination.records,
  );
  TestValidator.equals(
    "page 100 pages",
    page100Result.pagination.pages,
    page1Result.pagination.pages,
  );
  // 9. Test with explicit limit parameter
  TestValidator.equals(
    "limit 10 results count",
    page2Limit10Result.data.length,
    10,
  );
  TestValidator.equals(
    "limit 10 current",
    page2Limit10Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 10 limit",
    page2Limit10Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit 10 pages calculation",
    page2Limit10Result.pagination.pages,
    page2Limit10Result.pagination.records === 0
      ? 0
      : Math.ceil(
          page2Limit10Result.pagination.records /
            page2Limit10Result.pagination.limit,
        ),
  );
}