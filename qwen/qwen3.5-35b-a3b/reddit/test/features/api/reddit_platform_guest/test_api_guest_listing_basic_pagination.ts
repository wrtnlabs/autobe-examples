import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuest";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call guest listing endpoint with default pagination
  const response = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: {} satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate pagination calculation
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // Validate data array exists
  TestValidator.predicate(
    "data array exists",
    response.data !== undefined && Array.isArray(response.data),
  );
  // Validate each guest summary has valid business logic
  response.data.forEach((guest, index) => {
    typia.assert(guest);
    // Validate active_session_count is non-negative
    TestValidator.predicate(
      `guest ${index} active_session_count is non-negative`,
      guest.active_session_count >= 0,
    );
    // Validate timestamps are valid dates
    TestValidator.predicate(
      `guest ${index} created_at is valid date`,
      new Date(guest.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      `guest ${index} updated_at is valid date`,
      new Date(guest.updated_at).getTime() > 0,
    );
    TestValidator.predicate(
      `guest ${index} deleted_at is null or valid date`,
      guest.deleted_at === null || new Date(guest.deleted_at).getTime() > 0,
    );
  });
  // Validate records are sorted by created_at descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      TestValidator.predicate(
        "records sorted by created_at descending",
        new Date(current.created_at).getTime() >=
          new Date(next.created_at).getTime(),
      );
    }
  }
}
