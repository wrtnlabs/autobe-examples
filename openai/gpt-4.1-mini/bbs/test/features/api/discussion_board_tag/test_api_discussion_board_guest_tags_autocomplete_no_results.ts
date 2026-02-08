import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_guest_tags_autocomplete_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Test the tag autocomplete endpoint for guest user when no matching tags exist
  // 1. Create a guest connection and authorize guest join
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {},
  });
  // Update headers with guest token safely
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Call the autocomplete endpoint as guest with empty body
  //    The request DTO IDiscussionBoardTag.IRequest is {} and has no search query field,
  //    so we rely on empty body and expect empty or no matching tags (empty results).
  const response =
    await api.functional.discussionBoard.guest.tags.autocomplete.index(
      guestConnection,
      {
        body: {},
      },
    );
  // 3. Assert the response structure
  typia.assert(response);
  // 4. Validate the response contains empty data list
  TestValidator.equals("empty data list", response.data.length, 0);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  // The pagination limit can be any positive integer, commonly 10 or 20,
  // so just check it as positive number
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
}
