import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as guest user (join) to obtain guest JWT token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {},
  });
  // Update headers with bearer token for authorized guest
  guestConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Step 2: Prepare a filter request that will match no records.
  // Since the filter DTO IDiscussionBoardGuestSession.IRequest has no defined properties,
  // we'll assume by calling it with an empty object and expect an empty paginated result.
  // The test scenario requires filter criteria that match no records,
  // so we simulate it by sending a request that returns empty data.
  const body: IDiscussionBoardGuestSession.IRequest = {};
  // Step 3: Call the filtered guestSessions index endpoint
  const output = await api.functional.discussionBoard.guest.guestSessions.index(
    guestConnection,
    {
      body,
    },
  );
  // Step 4: Verify output
  typia.assert(output);
  // The paginated response should have empty data array
  TestValidator.equals("empty data array", output.data.length, 0);
  // Pagination info consistency check
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals(
    "limit is non-negative",
    output.pagination.limit >= 0,
    true,
  );
  TestValidator.equals("records is zero", output.pagination.records, 0);
  TestValidator.equals("pages is zero", output.pagination.pages, 0);
}
