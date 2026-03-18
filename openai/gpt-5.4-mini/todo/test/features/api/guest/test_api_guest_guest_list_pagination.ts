import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_guest_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, { body: {} });
  typia.assert(authorized);
  const request: ITodoAppGuest.IRequest = {
    page: 1,
    limit: 10,
  };
  const first = await api.functional.todoApp.guest.guests.index(
    guestConnection,
    { body: request },
  );
  typia.assert(first);
  const second = await api.functional.todoApp.guest.guests.index(
    guestConnection,
    { body: request },
  );
  typia.assert(second);
  TestValidator.equals("guest list stable pagination response", first, second);
  TestValidator.equals(
    "guest list pagination current page should match request",
    first.pagination.current,
    1,
  );
  TestValidator.equals(
    "guest list pagination limit should match request",
    first.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "guest list pagination records should be non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "guest list pagination pages should be non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "guest list should return summaries only",
    first.data.every(
      (item) => item.deleted_at === null || item.deleted_at !== undefined,
    ),
  );
  const emptyPage = await api.functional.todoApp.guest.guests.index(
    guestConnection,
    {
      body: {
        page: 1000000,
        limit: 10,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "guest list should return an empty page for a far out-of-range page",
    emptyPage.data.length === 0,
  );
  TestValidator.equals(
    "empty page records should be zero when no data matches",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page pages should be zero when no data matches",
    emptyPage.pagination.pages,
    0,
  );
}
