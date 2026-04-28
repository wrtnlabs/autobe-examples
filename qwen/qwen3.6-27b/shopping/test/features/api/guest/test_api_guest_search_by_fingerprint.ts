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

/**
 * Test guest search functionality using device fingerprint filtering parameters.
 *
 * Validates the complete guest search workflow including guest registration via device fingerprint, followed by searching guests using both partial and exact fingerprint matching. The test verifies that the search endpoint correctly filters guest records based on device fingerprint criteria.
 *
 * Special attention is given to verifying that partial search matches guests whose device_fingerprint contains the search term, while exact search returns only the guest with the specific fingerprint. Pagination metadata is also validated to ensure accurate result counts.
 *
 * 1. Guest joins with a known device fingerprint for testing.
 * 2. Search for guests using partial fingerprint match via search parameter.
 * 3. Verify partial search results contain the joined guest.
 * 4. Search for guests using exact fingerprint match via deviceFingerprint parameter.
 * 5. Verify exact search returns only the specific guest.
 * 6. Validate pagination metadata accuracy for filtered results.
 */
export async function test_api_guest_search_by_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins with a known device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const testFingerprint = `test-fp-${RandomGenerator.alphabets(16)}`;
  const authorizedGuest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: testFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommercePlatformGuest.IJoin,
  });
  typia.assert(authorizedGuest);
  TestValidator.equals(
    "guest fingerprint matches",
    authorizedGuest.device_fingerprint,
    testFingerprint,
  );
  // 2. Search for guests using partial fingerprint match via search parameter
  const partialSearchBody = {
    search: testFingerprint.slice(0, 15),
  } satisfies IEcommercePlatformGuest.IRequest;
  const partialSearchResponse =
    await api.functional.ecommercePlatform.guests.index(guestConnection, {
      body: partialSearchBody,
    });
  typia.assert(partialSearchResponse);
  // 3. Verify partial search results contain the joined guest
  TestValidator.predicate(
    "partial search has results",
    partialSearchResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "partial search includes the guest from fingerprint",
    partialSearchResponse.data.some(
      (g) => g.device_fingerprint === testFingerprint,
    ),
  );
  // 4. Search for guest using exact device fingerprint via deviceFingerprint parameter
  const exactSearchBody = {
    deviceFingerprint: testFingerprint,
  } satisfies IEcommercePlatformGuest.IRequest;
  const exactSearchResponse =
    await api.functional.ecommercePlatform.guests.index(guestConnection, {
      body: exactSearchBody,
    });
  typia.assert(exactSearchResponse);
  // 5. Verify exact search returns only the specific guest
  TestValidator.equals(
    "exact search returns one guest",
    exactSearchResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "exact search data length is one",
    exactSearchResponse.data.length,
    1,
  );
  TestValidator.equals(
    "exact search guest id matches",
    exactSearchResponse.data[0].id,
    authorizedGuest.id,
  );
  TestValidator.equals(
    "exact search guest fingerprint matches",
    exactSearchResponse.data[0].device_fingerprint,
    testFingerprint,
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current is 1",
    exactSearchResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    exactSearchResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination total records matches data length",
    exactSearchResponse.pagination.records,
    exactSearchResponse.data.length,
  );
}
