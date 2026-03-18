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

export async function test_api_guest_guest_list_search_sort(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const criteria: ITodoAppGuest.IRequest = {
    page: 1,
    limit: 10,
    search: "guest",
    sort: "created_at",
  };
  const first = await api.functional.todoApp.guest.guests.index(
    guestConnection,
    {
      body: criteria,
    },
  );
  typia.assert(first);
  const second = await api.functional.todoApp.guest.guests.index(
    guestConnection,
    {
      body: criteria,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "pagination metadata should be stable",
    first.pagination,
    second.pagination,
  );
  TestValidator.equals(
    "guest list results should be stable",
    first.data,
    second.data,
  );
  TestValidator.equals("current page should be 1", first.pagination.current, 1);
  TestValidator.equals(
    "page limit should match request",
    first.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records should be non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    first.pagination.pages >= 0,
  );
}
