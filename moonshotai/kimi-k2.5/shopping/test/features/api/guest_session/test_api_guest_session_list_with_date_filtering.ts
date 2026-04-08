import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_guest_session_list_with_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Prepare date filters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // 3. Call guest session list API with date filtering
  const response = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {
        createdAtStart: oneWeekAgo.toISOString(),
        createdAtEnd: now.toISOString(),
        lastActivityAtStart: oneDayAgo.toISOString(),
        lastActivityAtEnd: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  // 4. Validate complete response structure (includes pagination, guest data, status)
  typia.assert(response);
  // 5. Business logic validation - pagination values are meaningful
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit > 0,
  );
}
