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

export async function test_api_guest_guest_list_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  const request = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppGuest.IRequest;
  const first = await api.functional.todoApp.guest.guests.index(
    guestConnection,
    {
      body: request,
    },
  );
  typia.assert(first);
  const second = await api.functional.todoApp.guest.guests.index(
    guestConnection,
    {
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals("guest list response consistency", second, first);
  TestValidator.equals(
    "pagination current page",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    first.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    first.data.length <= first.pagination.limit,
  );
  TestValidator.predicate(
    "guest list returns an array of summaries",
    Array.isArray(first.data),
  );
}
