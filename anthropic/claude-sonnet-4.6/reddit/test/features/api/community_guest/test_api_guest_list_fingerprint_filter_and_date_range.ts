import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_list_fingerprint_filter_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Record time boundaries for date-range filter
  const beforeCreation = new Date(Date.now() - 60000).toISOString();
  // 1. Create a guest with a known fingerprint using the authorize utility
  const guestConnection: api.IConnection = { host: connection.host };
  const knownFingerprint = `test-device-fingerprint-${RandomGenerator.alphaNumeric(8)}`;
  const guestResult = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: knownFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestResult);
  const afterCreation = new Date(Date.now() + 60000).toISOString();
  // 2. Filter by fingerprint partial match and date range
  const searchConnection: api.IConnection = { host: connection.host };
  const fingerprintKeyword = "test-device-fingerprint";
  const filteredResult = await api.functional.community.guests.index(
    searchConnection,
    {
      body: {
        fingerprint: fingerprintKeyword,
        createdAt: {
          gte: beforeCreation,
          lte: afterCreation,
        },
        page: 1,
        limit: 10,
      } satisfies ICommunityGuest.IRequest,
    },
  );
  typia.assert(filteredResult);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", filteredResult.pagination.limit, 10);
  // Verify data array is non-empty and contains the created guest
  TestValidator.predicate(
    "data array non-empty",
    filteredResult.data.length > 0,
  );
  // Verify all returned records have fingerprint containing the search keyword
  for (const guest of filteredResult.data) {
    TestValidator.predicate(
      "fingerprint contains keyword",
      guest.fingerprint.includes(fingerprintKeyword),
    );
  }
  // Verify all returned records have created_at within the date range
  const gteMs = new Date(beforeCreation).getTime();
  const lteMs = new Date(afterCreation).getTime();
  for (const guest of filteredResult.data) {
    const createdMs = new Date(guest.created_at).getTime();
    TestValidator.predicate(
      "created_at within date range",
      createdMs >= gteMs && createdMs <= lteMs,
    );
  }
  // Verify the created guest appears in the results
  const foundGuest = filteredResult.data.find(
    (g) => g.fingerprint === knownFingerprint,
  );
  TestValidator.predicate(
    "created guest found in filtered results",
    foundGuest !== undefined,
  );
  // 3. Edge case: filter that matches no records
  const noMatchResult = await api.functional.community.guests.index(
    searchConnection,
    {
      body: {
        fingerprint: "nonexistent-fingerprint-zzz999",
      } satisfies ICommunityGuest.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "empty data for no-match filter",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for no-match filter",
    noMatchResult.pagination.records,
    0,
  );
}
