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

export async function test_api_discussion_board_guests_index_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create an actor-specific connection for admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Request with default pagination, no filters
  const body: IDiscussionBoardGuest.IRequest = {};
  const response = await api.functional.discussionBoard.guests.index(
    adminConnection,
    { body },
  );
  typia.assert(response);
  // Validate pagination metadata
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages is pages = Math.ceil(records / limit) or zero",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // Validate data array items
  TestValidator.predicate(
    "data length is less or equal to limit",
    data.length <= pagination.limit,
  );
  for (const guest of data) {
    typia.assert(guest);
  }
  // Validate default sorting - sortBy 'createdAt', sortOrder 'desc'
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    TestValidator.predicate(
      `createdAt descending order check for items ${i - 1} and ${i}`,
      new Date(prev.createdAt).getTime() >= new Date(curr.createdAt).getTime(),
    );
  }
  // Validate total count consistency
  TestValidator.predicate(
    "pagination records is greater or equal to data length",
    pagination.records >= data.length,
  );
}
