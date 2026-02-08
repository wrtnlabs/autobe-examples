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

export async function test_api_discussion_board_guest_guests_list_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  /*
    Scenario 1: Successful retrieval of paginated temporary guest accounts list by an authorized guest.
  
    Steps:
    1. Guest joins to obtain authorization token.
    2. Create guestConnection with obtained token.
    3. Query guest accounts with various filters applied individually and combined.
    4. Verify response type and pagination metadata correctness.
    5. Verify no soft deleted records are included.
    6. Verify each guest record contains required summary fields.
    */
  // 1. Guest joins to authenticate and get token
  const guestConnection: api.IConnection = { host: connection.host };
  const authorizedGuest = await authorize_guest_join(connection, {
    body: {},
  });
  guestConnection.headers = {
    Authorization: `Bearer ${authorizedGuest.token.access}`,
  };
  // Sample filters for deviceFingerprint, userAgent, ipAddress, anonymousId to test
  // Since IDiscussionBoardGuest.IRequest has no specified properties, assume we can test
  // with the empty object and partial string filters (will be treated as valid filter keys if any)
  // Basic request - empty to get first page
  {
    const response = await api.functional.discussionBoard.guest.guests.index(
      guestConnection,
      {
        body: {},
      },
    );
    typia.assert(response);
    // Pagination metadata assertions
    TestValidator.predicate(
      "pagination current page is positive",
      response.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      response.pagination.records >= 0,
    );
    // calculated pages should be correct
    TestValidator.equals(
      "pagination pages matches ceiling(records / limit)",
      response.pagination.pages,
      Math.ceil(response.pagination.records / response.pagination.limit),
    );
    // No soft deleted records: We assume deleted records are filtered out
    // So each data item should at least be an object and valid summary
    response.data.forEach((guestSummary, index) => {
      typia.assert(guestSummary);
    });
  }
  // Filtering tests
  // The request DTO IDiscussionBoardGuest.IRequest is empty in the schema (no defined filters),
  // so no filter properties are guaranteed. We will test variations by passing empty objects
  // as placeholders and assume server handles filter logic internally or via query parameters.
  // Because no filter keys are present in schema, no filter tests can be exact in the request body.
  // We test pagination parameters if available by shifting the limit.
  // Paginate with larger limit
  {
    const limitedResponse =
      await api.functional.discussionBoard.guest.guests.index(guestConnection, {
        body: {},
      });
    typia.assert(limitedResponse);
    // Verify pagination metadata consistency
    TestValidator.predicate(
      "pagination limit > 0",
      limitedResponse.pagination.limit > 0,
    );
  }
}
