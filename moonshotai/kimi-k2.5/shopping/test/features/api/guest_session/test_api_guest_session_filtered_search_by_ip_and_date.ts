import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_guest_session_filtered_search_by_ip_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Calculate date range (7 days ago to now)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // 3. Search guest sessions with IP filter and date range
  const response =
    await api.functional.ecommerceMall.superAdmin.guest_sessions.index(
      superAdminConnection,
      {
        body: {
          ip: "192.168",
          createdAtFrom: sevenDaysAgo.toISOString(),
          createdAtTo: now.toISOString(),
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate returned sessions match the filter criteria (business logic validation)
  const fromTime = sevenDaysAgo.getTime();
  const toTime = now.getTime();
  for (const session of response.data) {
    TestValidator.predicate(
      "session IP contains filter pattern '192.168'",
      session.ip.includes("192.168"),
    );
    const sessionCreatedAt = new Date(session.createdAt).getTime();
    TestValidator.predicate(
      "session createdAt is within specified date range",
      sessionCreatedAt >= fromTime && sessionCreatedAt <= toTime,
    );
  }
  // 5. Validate total count matches data array length if on first page
  if (response.pagination.current === 1) {
    TestValidator.equals(
      "data length matches records count for first page",
      response.data.length,
      Math.min(response.pagination.records, response.pagination.limit),
    );
  }
}
