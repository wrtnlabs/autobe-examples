import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditGuest";
import type { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
    } satisfies IRedditGuest.IJoin,
  });
  // 2. Get guest list with default pagination (page 1, limit 10)
  const guestList = await api.functional.reddit.guest.guests.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditGuest.IRequest,
    },
  );
  typia.assert(guestList);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "Current page should be 1",
    guestList.pagination.current,
    1,
  );
  TestValidator.equals("Limit should be 10", guestList.pagination.limit, 10);
  // 4. Validate data ordering (by created_at, newest to oldest)
  const expectedData = [...guestList.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.index(
    "guest list ordering by creation date",
    expectedData,
    guestList.data,
  );
}
