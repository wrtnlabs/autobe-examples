import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_guest_guests_default_pagination_no_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest by joining to obtain JWT token
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  // 2. Call PATCH /discussionBoard/guest/guests with no filters (empty body) to get default pagination
  const guestsPage = await api.functional.discussionBoard.guest.guests.index(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(guestsPage);
  // 3. Validate pagination structure
  const pagination = guestsPage.pagination;
  // Pagination fields: current, limit, records, pages. All non-negative numbers.
  TestValidator.predicate(
    "pagination.current is number >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is number >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is number >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is number >= 0",
    pagination.pages >= 0,
  );
  // 4. Validate data array is an array
  TestValidator.predicate("data is array", Array.isArray(guestsPage.data));
  // 5. Each item in data array should confirm to IDiscussionBoardGuest.ISummary type
  for (const guest of guestsPage.data) {
    typia.assert(guest);
  }
}
