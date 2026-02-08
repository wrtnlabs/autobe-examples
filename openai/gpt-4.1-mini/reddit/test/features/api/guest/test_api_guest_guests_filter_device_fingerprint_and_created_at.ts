import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_guests_filter_device_fingerprint_and_created_at(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieval of guest users filtered by partial device fingerprint and a created_at date range.
  // 1. Authorize as a guest user to gain access to guests list.
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestJoinConnection, {
    body: {},
  });
  guestJoinConnection.headers = {
    ...guestJoinConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create multiple guests with varied device fingerprints and created dates to test filtering.
  // For testing, simulate creating guests by repeated guest joining, but since only join endpoint exists for guests creation, assume it creates unique entries or mock up otherwise.
  // NOTE: Actual creation details are unavailable; the join endpoint with empty { } body is the only creation method for guests.
  // Using it multiple times to simulate diverse guests would normally create distinct device fingerprints, but as IJoin has no fields, rely on assumption or limited test.
  // 3. For realistic filtering, we do a sample fetch with filters on deviceFingerprint partial string and created_at timestamps.
  // Generate a partial device fingerprint substring for search test; since device fingerprint is not visible in guest join, we simulate expected partial match string.
  // Since we cannot set deviceFingerprint in join, test only created_at filter.
  // We use an early date and today date to filter recent guests.
  const startDateISOString = new Date(
    Date.now() - 1000 * 3600 * 24 * 7,
  ).toISOString(); // 7 days ago
  const endDateISOString = new Date().toISOString(); // now
  // 4. Execute patch API to retrieve filtered guests list
  // Request body for filtering, using deviceFingerprint partial and created_at range.
  // deviceFingerprint filter property does not exist in ICommunityPlatformGuest.IRequest (empty) by given definition,
  // so no filtering property is possible realistically.
  // Because the given DTO ICommunityPlatformGuest.IRequest is an empty object type {}, there are no fields to apply filters.
  // Therefore, we must make test call with empty filter object.
  // 5. Call the patch API via utility function and validate response.
  const guestConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.communityPlatform.guest.guests.patch(
    guestConnection,
    { body: {} },
  );
  typia.assert(response);
  // 6. Validate the response properties: pagination and data array
  TestValidator.predicate(
    "Pagination exists",
    response.pagination !== undefined && response.pagination !== null,
  );
  TestValidator.predicate("Data array exists", Array.isArray(response.data));
  // 7. Validate each guest summary item
  for (const guest of response.data) {
    typia.assert(guest);
  }
  // 8. Additional validation on pagination metadata
  TestValidator.predicate(
    "Pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Pagination current page positive or zero",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Pagination limit positive or zero",
    response.pagination.limit >= 0,
  );
  // 9. Since filters are not applicable due to empty ICommunityPlatformGuest.IRequest, skipping validation of filter effects.
  // This validates patch API call and dataset structure only.
}
