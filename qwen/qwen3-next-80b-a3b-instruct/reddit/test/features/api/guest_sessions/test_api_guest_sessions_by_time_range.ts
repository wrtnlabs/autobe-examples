import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_sessions_by_time_range(
  connection: api.IConnection,
): Promise<void> {
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const created_at_end = now.toISOString();
  const created_at_start = new Date(now.getTime() - oneDayMs).toISOString();
  const body: ICommunityGuest.IRequest = {
    created_at_start,
    created_at_end,
    limit: 20,
  };
  const response = await api.functional.community.guests.index(connection, {
    body,
  });
  typia.assert(response);
  // Validate pagination
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.equals(
    "data array is not empty",
    response.data.length > 0,
    true,
  );
  for (const session of response.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session has valid created_at",
      new Date((session as any).created_at).getTime() >=
        new Date(created_at_start).getTime(),
    );
    TestValidator.predicate(
      "session has valid created_at",
      new Date((session as any).created_at).getTime() <=
        new Date(created_at_end).getTime(),
    );
  }
  // Validate sorting: created_at descending
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      new Date((response.data[i - 1] as any).created_at).getTime() >=
        new Date((response.data[i] as any).created_at).getTime(),
    );
  }
}