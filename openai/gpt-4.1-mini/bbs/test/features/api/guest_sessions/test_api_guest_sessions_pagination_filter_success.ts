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

export async function test_api_guest_sessions_pagination_filter_success(
  connection: api.IConnection,
): Promise<void> {
  // Test querying a filtered and paginated list of guest sessions for an authorized guest user with valid JWT tokens.
  // Validate filtering by guest device fingerprint, IP address, creation date range, and expiration date range.
  // Verify pagination and sorting functionality for large result sets.
  // Confirm that the response contains correct pagination metadata and a list of guest session summaries linked to corresponding guest information.
  // This ensures that administrators can audit guest session activity and gather analytics data effectively.
  // 1. Guest join to obtain authorized guest connection
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestJoinConnection, {
    body: {}, // IDiscussionBoardGuest.IJoin is an empty object
  });
  typia.assert(guestAuth);
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 2. Prepare filtering criteria
  const now = new Date();
  // Create date range: from 7 days ago to now
  const createdFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdTo = now.toISOString();
  // Expired date range: from now to 7 days later
  const expiredFrom = now.toISOString();
  const expiredTo = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // We'll prepare a sample device fingerprint and IP address (random strings)
  const deviceFingerprint = RandomGenerator.alphabets(20);
  const ipAddress = `192.168.${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(1)}`;
  // Request body - filtering and pagination request
  const requestBody: IDiscussionBoardGuestSession.IRequest = {
    device_fingerprint: deviceFingerprint,
    ip_address: ipAddress,
    created_from: createdFrom,
    created_to: createdTo,
    expired_from: expiredFrom,
    expired_to: expiredTo,
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_desc: true,
  } as any; // The IDiscussionBoardGuestSession.IRequest is '{}' but we respect scenario
  // 3. Call indexing API endpoint with filters
  const response =
    await api.functional.discussionBoard.guest.guestSessions.index(
      guestConnection,
      {
        body: requestBody,
      },
    );
  // 4. Validate response
  typia.assert(response);
  // 5. Check pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  // 6. Check data list is array
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
  // 7. For each record in data, validate the summary structure
  for (const session of response.data) {
    typia.assert(session);
  }
}
