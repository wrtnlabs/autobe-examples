import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_listing_device_fingerprint_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve all guests to establish baseline
  const allGuests = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies IHrmPlatformGuest.IRequest,
  });
  typia.assert(allGuests);
  // 2. Test partial fingerprint match if guests exist
  if (allGuests.data.length > 0) {
    const firstGuest = allGuests.data[0];
    const fingerprintSubstring = firstGuest.device_fingerprint.substring(0, 8);
    const partialMatchResult = await api.functional.hrmPlatform.guests.index(
      connection,
      {
        body: {
          search: fingerprintSubstring,
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformGuest.IRequest,
      },
    );
    typia.assert(partialMatchResult);
    // Verify partial match returns guests with matching fingerprints
    TestValidator.predicate(
      "partial match returns filtered results",
      partialMatchResult.data.every((guest) =>
        guest.device_fingerprint.includes(fingerprintSubstring),
      ),
    );
    TestValidator.predicate(
      "partial match record count matches data length",
      partialMatchResult.pagination.records === partialMatchResult.data.length,
    );
  }
  // 3. Test non-matching search term returns empty results
  const nonMatchingSearch = "NONEXISTENT_FINGERPRINT_12345";
  const emptyResult = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        search: nonMatchingSearch,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformGuest.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Validate empty result structure
  TestValidator.equals(
    "non-matching search returns empty data",
    emptyResult.data,
    [],
  );
  TestValidator.equals(
    "non-matching search records count is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching search pages count is 0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-matching search current page is 1",
    emptyResult.pagination.current,
    1,
  );
}
