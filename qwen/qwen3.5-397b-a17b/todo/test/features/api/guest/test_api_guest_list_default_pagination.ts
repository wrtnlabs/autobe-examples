import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call the guest list endpoint with default parameters (no filters)
  const response = await api.functional.todoApp.guests.index(connection, {
    body: {} satisfies ITodoAppGuest.IRequest,
  });
  typia.assert(response);
  // Validate data array exists and contains guest summaries
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Validate each guest summary structure
  for (const guest of response.data) {
    typia.assert(guest);
  }
  // Verify sorting by created_at DESC (most recent first) - business logic validation
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sorted by created_at DESC at index ${i}`,
        current >= next,
      );
    }
  }
  // Validate pagination metadata consistency - business logic validation
  if (response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation",
      response.pagination.pages,
      expectedPages,
    );
  }
  // Verify default pagination values
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
}
