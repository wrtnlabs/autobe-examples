import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_sessions_timestamp_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create time range for testing
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(
    now.getTime() - 2 * 60 * 60 * 1000,
  ).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  // Test timestamp filtering with created_at range
  const guest1 = await api.functional.discussionBoard.guests.index(connection, {
    body: {
      createdAtFrom: twoHoursAgo,
      createdAtTo: oneHourLater,
    } satisfies IDiscussionBoardGuest.IRequest,
  });
  typia.assert(guest1);
  TestValidator.predicate("has pagination", guest1.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(guest1.data));
  for (const session of guest1.data) {
    TestValidator.predicate(
      "created_at >= createdAtFrom",
      new Date(session.created_at) >= new Date(twoHoursAgo),
    );
    TestValidator.predicate(
      "created_at <= createdAtTo",
      new Date(session.created_at) <= new Date(oneHourLater),
    );
  }
  // Test with specific time range
  const guest2 = await api.functional.discussionBoard.guests.index(connection, {
    body: {
      createdAtFrom: oneHourAgo,
      createdAtTo: oneHourLater,
    } satisfies IDiscussionBoardGuest.IRequest,
  });
  typia.assert(guest2);
  TestValidator.equals("page is 1", guest2.pagination.current, 1);
  TestValidator.equals("limit is 20", guest2.pagination.limit, 20);
  // Test updated_at filtering
  const guest3 = await api.functional.discussionBoard.guests.index(connection, {
    body: {
      updatedAtFrom: twoHoursAgo,
      updatedAtTo: oneHourLater,
    } satisfies IDiscussionBoardGuest.IRequest,
  });
  typia.assert(guest3);
  TestValidator.predicate(
    "updated_at filtering works",
    Array.isArray(guest3.data),
  );
  // Test with no matching records
  const pastGuest = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: {
        createdAtFrom: "2020-01-01T00:00:00.000Z",
        createdAtTo: "2020-01-02T00:00:00.000Z",
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(pastGuest);
  TestValidator.predicate(
    "past dates return no results",
    pastGuest.pagination.records === 0,
  );
}
