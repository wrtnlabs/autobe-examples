import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_filtering_by_date_range_and_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin (creates session 1)
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {});
  typia.assert(firstAdmin);
  // Small delay to ensure different timestamps for sessions
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 2. Create second admin (creates session 2)
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(secondAdminConnection, {});
  typia.assert(secondAdmin);
  // 3. Get current time and calculate date range covering both sessions
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  // 4. Query sessions filtering by first admin's ID and wide date range
  const wideRangeResult =
    await api.functional.ecommerceMall.admin.admin.sessions.index(connection, {
      body: {
        adminId: firstAdmin.id,
        createdFrom: oneHourAgo,
        createdTo: oneHourLater,
      } satisfies IEcommerceMallAdminSession.IRequest,
    });
  typia.assert(wideRangeResult);
  // Validate all returned sessions belong to first admin
  TestValidator.predicate("all sessions belong to first admin", () =>
    wideRangeResult.data.every((session) => session.admin.id === firstAdmin.id),
  );
  TestValidator.predicate(
    "has at least one session",
    wideRangeResult.data.length > 0,
  );
  // 5. Query sessions filtering by second admin's ID with same date range
  const secondAdminResult =
    await api.functional.ecommerceMall.admin.admin.sessions.index(connection, {
      body: {
        adminId: secondAdmin.id,
        createdFrom: oneHourAgo,
        createdTo: oneHourLater,
      } satisfies IEcommerceMallAdminSession.IRequest,
    });
  typia.assert(secondAdminResult);
  // Validate all returned sessions belong to second admin
  TestValidator.predicate("all sessions belong to second admin", () =>
    secondAdminResult.data.every(
      (session) => session.admin.id === secondAdmin.id,
    ),
  );
  TestValidator.predicate(
    "has at least one session",
    secondAdminResult.data.length > 0,
  );
  // 6. Narrow date range to exclude both admins (far future)
  const farFuture = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const furtherFuture = new Date(
    now.getTime() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResult =
    await api.functional.ecommerceMall.admin.admin.sessions.index(connection, {
      body: {
        createdFrom: farFuture,
        createdTo: furtherFuture,
      } satisfies IEcommerceMallAdminSession.IRequest,
    });
  typia.assert(emptyResult);
  // Validate no sessions found in far future range
  TestValidator.equals("no sessions in far future", emptyResult.data.length, 0);
}
