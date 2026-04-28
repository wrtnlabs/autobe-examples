import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a guest to create a test record
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: undefined,
  });
  typia.assert(guestAuthorized);
  // 2. Query with createdAtFrom and createdAtTo parameters to filter guests created within a specific time period
  const createdDate = guestAuthorized.created_at;
  const responseCreatedAt = await api.functional.ecommercePlatform.guests.index(
    guestConnection,
    {
      body: {
        createdAtFrom: new Date(0).toISOString(),
        createdAtTo: new Date().toISOString(),
      } satisfies IEcommercePlatformGuest.IRequest,
    },
  );
  typia.assert(responseCreatedAt);
  // Verify that the guest is included in the results
  TestValidator.predicate(
    "guest found in creation date range",
    responseCreatedAt.data.some((g) => g.id === guestAuthorized.id),
  );
  // 3. Query with updatedAtFrom and updatedAtTo parameters to filter by update timeframe
  const updatedDate = guestAuthorized.updated_at;
  const responseUpdatedAt = await api.functional.ecommercePlatform.guests.index(
    guestConnection,
    {
      body: {
        updatedAtFrom: new Date(0).toISOString(),
        updatedAtTo: new Date().toISOString(),
      } satisfies IEcommercePlatformGuest.IRequest,
    },
  );
  typia.assert(responseUpdatedAt);
  // Verify that the guest is included in the results
  TestValidator.predicate(
    "guest found in update date range",
    responseUpdatedAt.data.some((g) => g.id === guestAuthorized.id),
  );
  // 4. Test edge case: empty result set when date range excludes all existing guests
  // Use a future date range that effectively excludes all current guests
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 100);
  const responseEmpty = await api.functional.ecommercePlatform.guests.index(
    guestConnection,
    {
      body: {
        createdAtFrom: futureDate.toISOString(),
        createdAtTo: new Date(futureDate.getTime() + 86400000).toISOString(), // 1 day range in the far future
      } satisfies IEcommercePlatformGuest.IRequest,
    },
  );
  typia.assert(responseEmpty);
  // Verify that the specific guest is NOT in the results
  TestValidator.predicate(
    "guest excluded from future date range",
    !responseEmpty.data.some((g) => g.id === guestAuthorized.id),
  );
  // 5. Verify pagination metadata fields exist
  TestValidator.predicate(
    "pagination exists",
    responseCreatedAt.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof responseCreatedAt.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination current is number",
    typeof responseCreatedAt.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof responseCreatedAt.pagination.pages === "number",
  );
}
