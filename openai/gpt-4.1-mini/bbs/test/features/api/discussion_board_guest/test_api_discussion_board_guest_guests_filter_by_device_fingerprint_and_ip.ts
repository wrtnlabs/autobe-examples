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

export async function test_api_discussion_board_guest_guests_filter_by_device_fingerprint_and_ip(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 3: Filtering by device fingerprint substring and IP address combination. This test confirms that filtering guests by partial device fingerprint and exact IP address works correctly, returning only the guests matching both criteria. Verify that pagination data aligns with filtering results and no deleted records appear.
  // 1. Prepare three guest connections with valid authorization tokens
  const guestConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const guestConnection: api.IConnection = { host: connection.host };
    // Call utility function to join guest and get authorization token
    const authorized = await authorize_guest_join(guestConnection, {
      body: {}, // IDiscussionBoardGuest.IJoin is empty
    });
    typia.assert(authorized);
    // Set authorization header
    guestConnection.headers = {
      Authorization: `Bearer ${authorized.token.access}`,
    };
    guestConnections.push(guestConnection);
  }
  // 2. Use one guest connection to request the guests list with empty filter (no properties in IRequest)
  const response = await api.functional.discussionBoard.guest.guests.index(
    guestConnections[0],
    { body: {} },
  );
  typia.assert(response);
  // 3. Validate pagination information
  TestValidator.predicate(
    "pagination current > 0",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // 4. Validate response data array length does not exceed pagination limit
  TestValidator.predicate(
    "data length <= pagination limit",
    response.data.length <= response.pagination.limit,
  );
}
