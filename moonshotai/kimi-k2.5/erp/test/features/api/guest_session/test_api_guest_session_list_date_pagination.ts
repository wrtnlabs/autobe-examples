import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test session date range filtering and pagination edge cases.
 * 1) Initialize guest access to create session
 * 2) Call sessions list with createdAfter filter set to future time (should return empty)
 * 3) Call with createdBefore filter set to future date (should return matching sessions including ours)
 * 4) Test pagination with limit parameter (set limit=1)
 * 5) Verify pagination metadata shows correct record counts and page calculations
 * 6) If multiple pages exist, test page-based pagination by requesting page 2
 * 7) Verify pagination returns consistent results without duplication or gaps
 * 8) Test status filter to validate filtering
 */
export async function test_api_guest_session_list_date_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Initialize guest access to create session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmGuest.IJoin,
  });
  const now = new Date();
  const farFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future
  // 2. Test createdAfter filter with future date (should return empty since session created now, not after future)
  const futureFilterResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAfter: farFuture.toISOString(),
        createdBefore: null,
        status: null,
        ipPattern: null,
        referrerPattern: null,
        cursor: null,
        limit: null,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(futureFilterResult);
  TestValidator.equals(
    "future filter returns empty data",
    futureFilterResult.data.length,
    0,
  );
  // 3. Test createdBefore filter with future date (should include our recently created session)
  const pastFilterResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAfter: null,
        createdBefore: farFuture.toISOString(),
        status: null,
        ipPattern: null,
        referrerPattern: null,
        cursor: null,
        limit: null,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(pastFilterResult);
  TestValidator.predicate(
    "past filter returns at least one session",
    pastFilterResult.data.length >= 1,
  );
  // 4. Test pagination with limit=1
  const limitedResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAfter: null,
        createdBefore: null,
        status: null,
        ipPattern: null,
        referrerPattern: null,
        cursor: null,
        limit: 1,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(limitedResult);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    limitedResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "total records >= 1",
    limitedResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages >= 1",
    limitedResult.pagination.pages >= 1,
  );
  TestValidator.equals(
    "current page is 1",
    limitedResult.pagination.current,
    1,
  );
  // 6 & 7. If multiple pages exist, test page-based pagination
  if (limitedResult.pagination.pages > 1 && limitedResult.data.length > 0) {
    const secondPageResult = await api.functional.erpHrm.guest.sessions.index(
      guestConnection,
      {
        body: {
          createdAfter: null,
          createdBefore: null,
          status: null,
          ipPattern: null,
          referrerPattern: null,
          cursor: null,
          limit: 1,
          page: 2,
        } satisfies IErpHrmMemberSession.IRequest,
      },
    );
    typia.assert(secondPageResult);
    TestValidator.equals(
      "second page current is 2",
      secondPageResult.pagination.current,
      2,
    );
    if (secondPageResult.data.length > 0) {
      TestValidator.notEquals(
        "different sessions on different pages",
        limitedResult.data[0].id,
        secondPageResult.data[0].id,
      );
    }
  }
  // 8. Test status filter - all returned active sessions should have isActive=true
  const activeResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        createdAfter: null,
        createdBefore: null,
        status: "active",
        ipPattern: null,
        referrerPattern: null,
        cursor: null,
        limit: null,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(activeResult);
  activeResult.data.forEach((session, index) => {
    TestValidator.equals(
      `active session ${index} has isActive true`,
      session.isActive,
      true,
    );
  });
}
