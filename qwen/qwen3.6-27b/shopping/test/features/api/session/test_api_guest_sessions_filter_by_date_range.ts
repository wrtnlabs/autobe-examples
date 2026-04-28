import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import type { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering guest sessions by creation date range.
 *
 * Validates the date range filtering functionality for guest session queries using the PATCH /ecommercePlatform/guest/sessions endpoint. Authenticates as a guest and submits search criteria with created_at_from and created_at_to parameters to filter sessions by their creation timestamp.
 *
 * Confirms that all returned sessions fall within the specified date range (inclusive on both ends) and that pagination metadata accurately reflects the filtered result count.
 *
 * 1. Authenticate as a guest using device fingerprint.
 * 2. Define a date range with created_at_from set to 7 days in the past and created_at_to set to 1 day in the future, both in ISO 8601 format.
 * 3. Submit PATCH request to query guest sessions filtered by the date range.
 * 4. Validate that all returned sessions have created_at timestamps between the range boundaries (inclusive).
 * 5. Verify pagination metadata matches the filtered result set.
 */
export async function test_api_guest_sessions_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, { body: {} });
  typia.assert(guest);
  // 2. Define date range boundaries (7 days past to 1 day future)
  const createdAtFrom = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  // 3. Submit PATCH request with date range filter
  const body = {
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
  } satisfies IEcommercePlatformGuestSession.IRequest;
  const response = await api.functional.ecommercePlatform.guest.sessions.index(
    guestConnection,
    { body },
  );
  typia.assert(response);
  // 4. Validate all sessions within date range (inclusive)
  TestValidator.predicate("all sessions within date range", () =>
    response.data.every(
      (session) =>
        session.created_at >= createdAtFrom &&
        session.created_at <= createdAtTo,
    ),
  );
  // 5. Validate pagination metadata reflects filtered count
  TestValidator.predicate(
    "pagination records match data length",
    () => response.pagination.records === response.data.length,
  );
}
