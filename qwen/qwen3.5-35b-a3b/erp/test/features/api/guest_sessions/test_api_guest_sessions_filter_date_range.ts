import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import type { IHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account and get hrms_guest_id
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  const hrmsGuestId = joinResult.id;
  // 2. Create additional sessions by making multiple authenticated requests
  // Make several join requests to create multiple sessions with different timestamps
  const sessionConnections: api.IConnection[] = [];
  for (let i = 0; i < 5; i++) {
    const sessionConnection: api.IConnection = { host: connection.host };
    const sessionResult = await authorize_guest_join(sessionConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(sessionResult);
    sessionConnections.push(sessionConnection);
  }
  // Wait a bit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Test created_date_range filter
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rangeConnection: api.IConnection = { host: connection.host };
  const rangeResult = await api.functional.hrms.guest.guest_sessions.index(
    rangeConnection,
    {
      body: {
        created_date_range: [sevenDaysAgo.toISOString(), now.toISOString()],
      },
    },
  );
  typia.assert(rangeResult);
  // 4. Test sorting functionality
  const sortConnection: api.IConnection = { host: connection.host };
  const sortResult = await api.functional.hrms.guest.guest_sessions.index(
    sortConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      },
    },
  );
  typia.assert(sortResult);
  // 5. Test pagination with different page sizes
  const paginationConnection: api.IConnection = { host: connection.host };
  const pageSize5Result = await api.functional.hrms.guest.guest_sessions.index(
    paginationConnection,
    {
      body: {
        page_size: 5,
      },
    },
  );
  typia.assert(pageSize5Result);
  const pageSize20Result = await api.functional.hrms.guest.guest_sessions.index(
    paginationConnection,
    {
      body: {
        page_size: 20,
      },
    },
  );
  typia.assert(pageSize20Result);
  const pageSize100Result =
    await api.functional.hrms.guest.guest_sessions.index(paginationConnection, {
      body: {
        page_size: 100,
      },
    });
  typia.assert(pageSize100Result);
  // 6. Test combined filters
  const combinedConnection: api.IConnection = { host: connection.host };
  const combinedResult = await api.functional.hrms.guest.guest_sessions.index(
    combinedConnection,
    {
      body: {
        created_date_range: [sevenDaysAgo.toISOString(), now.toISOString()],
        sort_by: "created_at",
        sort_order: "desc",
        page_size: 10,
      },
    },
  );
  typia.assert(combinedResult);
  // 7. Test edge case: date range with no matching results
  const pastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oldDateRangeConnection: api.IConnection = { host: connection.host };
  const emptyResult = await api.functional.hrms.guest.guest_sessions.index(
    oldDateRangeConnection,
    {
      body: {
        created_date_range: [
          pastYear.toISOString(),
          sevenDaysAgo.toISOString(),
        ],
      },
    },
  );
  typia.assert(emptyResult);
}