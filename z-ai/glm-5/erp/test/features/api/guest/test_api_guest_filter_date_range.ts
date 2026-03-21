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

export async function test_api_guest_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Get all guests without filter to understand the data
  const allGuests = await api.functional.erpHrm.member.guests.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  // If there are guests, use their dates for testing
  if (allGuests.data.length > 0) {
    // Sort guests by created_at
    const sortedGuests = [...allGuests.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    // Get date range from actual data
    const oldestGuest = sortedGuests[0];
    const newestGuest = sortedGuests[sortedGuests.length - 1];
    // 3. Test filtering with both created_at_from and created_at_to (full range)
    const fromDate = oldestGuest.created_at;
    const toDate = newestGuest.created_at;
    const rangeFiltered = await api.functional.erpHrm.member.guests.index(
      memberConnection,
      {
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies IErpHrmGuest.IRequest,
      },
    );
    typia.assert(rangeFiltered);
    // Validate all returned guests fall within the date range
    for (const guest of rangeFiltered.data) {
      const guestDate = new Date(guest.created_at);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      TestValidator.predicate(
        "guest created_at >= created_at_from",
        guestDate.getTime() >= from.getTime(),
      );
      TestValidator.predicate(
        "guest created_at <= created_at_to",
        guestDate.getTime() <= to.getTime(),
      );
    }
    // 4. Test filtering with only created_at_from (lower bound)
    const fromOnlyFiltered = await api.functional.erpHrm.member.guests.index(
      memberConnection,
      {
        body: {
          created_at_from: fromDate,
        } satisfies IErpHrmGuest.IRequest,
      },
    );
    typia.assert(fromOnlyFiltered);
    // Validate all returned guests have created_at >= from
    for (const guest of fromOnlyFiltered.data) {
      const guestDate = new Date(guest.created_at);
      const from = new Date(fromDate);
      TestValidator.predicate(
        "guest created_at >= created_at_from (from only filter)",
        guestDate.getTime() >= from.getTime(),
      );
    }
    // 5. Test filtering with only created_at_to (upper bound)
    const toOnlyFiltered = await api.functional.erpHrm.member.guests.index(
      memberConnection,
      {
        body: {
          created_at_to: toDate,
        } satisfies IErpHrmGuest.IRequest,
      },
    );
    typia.assert(toOnlyFiltered);
    // Validate all returned guests have created_at <= to
    for (const guest of toOnlyFiltered.data) {
      const guestDate = new Date(guest.created_at);
      const to = new Date(toDate);
      TestValidator.predicate(
        "guest created_at <= created_at_to (to only filter)",
        guestDate.getTime() <= to.getTime(),
      );
    }
    // 6. Verify boundary inclusivity by using the oldest guest's created_at as both from and to
    // This should include the oldest guest
    const exactDateFiltered = await api.functional.erpHrm.member.guests.index(
      memberConnection,
      {
        body: {
          created_at_from: oldestGuest.created_at,
          created_at_to: oldestGuest.created_at,
        } satisfies IErpHrmGuest.IRequest,
      },
    );
    typia.assert(exactDateFiltered);
    // Should contain at least the oldest guest (boundary inclusive)
    const foundOldest = exactDateFiltered.data.some(
      (g) => g.id === oldestGuest.id,
    );
    TestValidator.predicate(
      "boundary inclusive - oldest guest found when filtering by exact date",
      foundOldest,
    );
    // 7. Verify range filtering is subset of full data
    TestValidator.predicate(
      "filtered count <= total count",
      rangeFiltered.data.length <= allGuests.data.length,
    );
  }
  // 8. Test with future dates (should return empty or minimal results)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const futureFiltered = await api.functional.erpHrm.member.guests.index(
    memberConnection,
    {
      body: {
        created_at_from: futureDate.toISOString(),
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(futureFiltered);
  // Future dates should return empty results (no guests created in the future)
  TestValidator.equals(
    "future date filter returns empty",
    futureFiltered.data.length,
    0,
  );
  // 9. Test with pagination combined with date range filtering
  const paginatedFiltered = await api.functional.erpHrm.member.guests.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
        created_at_from: new Date(0).toISOString(),
        created_at_to: new Date().toISOString(),
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(paginatedFiltered);
  // Verify pagination metadata is present
  TestValidator.predicate(
    "pagination current is valid",
    paginatedFiltered.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    paginatedFiltered.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records >= returned data count",
    paginatedFiltered.pagination.records >= paginatedFiltered.data.length,
  );
}
