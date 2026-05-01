import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest listing with fingerprint filter.
 *
 * Validates that the guest listing endpoint correctly filters results by device
 * fingerprint hash when a partial fingerprint value is provided in the request
 * body. Ensures that all returned guest records have fingerprint values
 * containing the provided substring, and that guests with no matching
 * fingerprint are excluded from the results.
 *
 * 1. Fetch all guests without any filter to obtain existing fingerprint data.
 * 2. Extract a partial substring from one of the fetched guest fingerprints.
 * 3. Call the listing endpoint with the partial fingerprint as a filter.
 * 4. Validate that every returned guest record has a fingerprint containing the
 *    filter substring.
 * 5. Validate that the filtered result count is a subset of the total guest
 *    count, confirming exclusion of non-matching guests.
 */
export async function test_api_guest_listing_fingerprint_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all guests without filter to obtain baseline
  const allGuests = await api.functional.communityHub.guests.index(connection, {
    body: {
      limit: 100,
    } satisfies ICommunityHubGuest.IRequest,
  });
  typia.assert(allGuests);
  TestValidator.predicate(
    "at least one guest exists for filtering",
    allGuests.data.length > 0,
  );
  // 2. Extract a partial fingerprint substring from one guest
  const sourceGuest = allGuests.data[0];
  const partialFingerprint = RandomGenerator.substring(sourceGuest.fingerprint);
  // 3. Call with fingerprint filter
  const filteredResults = await api.functional.communityHub.guests.index(
    connection,
    {
      body: {
        fingerprint: partialFingerprint,
        limit: 100,
      } satisfies ICommunityHubGuest.IRequest,
    },
  );
  typia.assert(filteredResults);
  // 4. Validate every returned guest contains the filter substring
  TestValidator.predicate(
    "filtered results are not empty",
    filteredResults.data.length > 0,
  );
  for (const guest of filteredResults.data) {
    TestValidator.predicate(
      `guest fingerprint contains partial filter substring`,
      guest.fingerprint.includes(partialFingerprint),
    );
  }
  // 5. Validate filtered count is subset of total
  TestValidator.predicate(
    "filtered record count is a subset of total guest count",
    filteredResults.pagination.records <= allGuests.pagination.records,
  );
  // 6. Verify the source guest is present in filtered results
  const sourceInFiltered = filteredResults.data.some(
    (g) => g.id === sourceGuest.id,
  );
  TestValidator.predicate(
    "source guest is included in filtered results",
    sourceInFiltered,
  );
}
