import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test fingerprint filtering with partial matching (ILIKE behavior).
 *
 * Verifies that the guest list endpoint supports case-insensitive
 * partial fingerprint matching and pagination works correctly with filters.
 */
export async function test_api_guest_filter_fingerprint_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Get all guests to understand existing data
  const allGuests = await api.functional.erpHrm.member.guests.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  // 3. If there are guests, test partial fingerprint matching
  if (allGuests.data.length > 0) {
    const sampleGuest = allGuests.data[0];
    const fullFingerprint = sampleGuest.fingerprint;
    // Ensure we have enough characters for pattern extraction
    const patternLength = Math.max(
      1,
      Math.min(4, Math.floor(fullFingerprint.length / 3)),
    );
    // Test 1: Beginning of fingerprint
    const beginPattern = fullFingerprint.substring(0, patternLength);
    const beginResult = await api.functional.erpHrm.member.guests.index(
      memberConnection,
      {
        body: {
          fingerprint: beginPattern,
        } satisfies IErpHrmGuest.IRequest,
      },
    );
    typia.assert(beginResult);
    // Verify results contain matching guests
    TestValidator.predicate(
      "beginning pattern should find matching guests",
      beginResult.data.some((guest) =>
        guest.fingerprint.toLowerCase().includes(beginPattern.toLowerCase()),
      ),
    );
    // Verify all returned guests match the pattern
    beginResult.data.forEach((guest) => {
      TestValidator.predicate(
        `guest fingerprint contains beginning pattern`,
        guest.fingerprint.toLowerCase().includes(beginPattern.toLowerCase()),
      );
    });
    // Test 2: Middle of fingerprint
    if (fullFingerprint.length >= 3) {
      const middleStart = Math.floor(fullFingerprint.length / 3);
      const middlePattern = fullFingerprint.substring(
        middleStart,
        middleStart + patternLength,
      );
      const middleResult = await api.functional.erpHrm.member.guests.index(
        memberConnection,
        {
          body: {
            fingerprint: middlePattern,
          } satisfies IErpHrmGuest.IRequest,
        },
      );
      typia.assert(middleResult);
      // Verify all returned guests match the middle pattern
      middleResult.data.forEach((guest) => {
        TestValidator.predicate(
          `guest fingerprint contains middle pattern`,
          guest.fingerprint.toLowerCase().includes(middlePattern.toLowerCase()),
        );
      });
    }
    // Test 3: End of fingerprint
    const endPattern = fullFingerprint.substring(
      fullFingerprint.length - patternLength,
    );
    const endResult = await api.functional.erpHrm.member.guests.index(
      memberConnection,
      {
        body: {
          fingerprint: endPattern,
        } satisfies IErpHrmGuest.IRequest,
      },
    );
    typia.assert(endResult);
    // Verify all returned guests match the end pattern
    endResult.data.forEach((guest) => {
      TestValidator.predicate(
        `guest fingerprint contains end pattern`,
        guest.fingerprint.toLowerCase().includes(endPattern.toLowerCase()),
      );
    });
    // Test 4: Case-insensitive matching (ILIKE behavior)
    if (fullFingerprint.length > 0) {
      // Test with uppercase and lowercase versions
      const upperPattern = beginPattern.toUpperCase();
      const lowerPattern = beginPattern.toLowerCase();
      const upperResult = await api.functional.erpHrm.member.guests.index(
        memberConnection,
        {
          body: {
            fingerprint: upperPattern,
          } satisfies IErpHrmGuest.IRequest,
        },
      );
      typia.assert(upperResult);
      const lowerResult = await api.functional.erpHrm.member.guests.index(
        memberConnection,
        {
          body: {
            fingerprint: lowerPattern,
          } satisfies IErpHrmGuest.IRequest,
        },
      );
      typia.assert(lowerResult);
      // Case should not matter - both should return same count
      TestValidator.equals(
        "case-insensitive: uppercase and lowercase patterns return same count",
        upperResult.pagination.records,
        lowerResult.pagination.records,
      );
    }
    // Test 5: Pagination with fingerprint filter
    if (allGuests.pagination.records > 1) {
      const paginatedResult = await api.functional.erpHrm.member.guests.index(
        memberConnection,
        {
          body: {
            fingerprint: beginPattern,
            page: 1,
            limit: 1,
          } satisfies IErpHrmGuest.IRequest,
        },
      );
      typia.assert(paginatedResult);
      TestValidator.equals(
        "pagination page should be 1",
        paginatedResult.pagination.current,
        1,
      );
      TestValidator.equals(
        "pagination limit should be 1",
        paginatedResult.pagination.limit,
        1,
      );
      TestValidator.predicate(
        "pagination records should be positive",
        paginatedResult.pagination.records > 0,
      );
      TestValidator.predicate(
        "pagination pages should be positive",
        paginatedResult.pagination.pages > 0,
      );
    }
  }
  // Test 6: Empty result set for non-matching pattern
  const nonMatchingPattern = "xyz123nonexistentfingerprint999";
  const emptyResult = await api.functional.erpHrm.member.guests.index(
    memberConnection,
    {
      body: {
        fingerprint: nonMatchingPattern,
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "non-matching pattern returns empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching pattern returns zero records",
    emptyResult.pagination.records,
    0,
  );
}
