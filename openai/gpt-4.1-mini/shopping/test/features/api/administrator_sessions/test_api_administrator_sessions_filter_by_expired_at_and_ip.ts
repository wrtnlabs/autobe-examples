import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorSession";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sessions_filter_by_expired_at_and_ip(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (registers) to obtain authorized session
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "abcdefgh",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Create multiple sessions by calling index with different filters
  // We will create random expired_at ranges to filter
  // Common filter params
  const substringIp = "127.0."; // use common local IP substring
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const toDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days ahead
  // 3. Test filtering: expiredAt from-to, ip substring, pagination, sorting
  // Prepare request body with filter for expiredAt and ip
  const expiredFromISOString = fromDate.toISOString();
  const expiredToISOString = toDate.toISOString();
  const pageSize = 10;
  // Test ascending sort
  const ascReqBody: IShoppingMallAdministratorSession.IRequest = {
    expiredAt: {
      from: expiredFromISOString,
      to: expiredToISOString,
    },
    ip: substringIp,
    page: 1,
    limit: pageSize,
    sort: "expired_at",
  };
  const ascResult =
    await api.functional.shoppingMall.administrator.sessions.index(
      adminConnection,
      { body: ascReqBody },
    );
  typia.assert(ascResult);
  // Validate expiredAt range and IP substring for all sessions
  for (const session of ascResult.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session expired_at within filter range and ip includes substring: ${session.id}`,
      expiredAt >= fromDate &&
        expiredAt <= toDate &&
        session.ip.includes(substringIp),
    );
  }
  // Validate sorted ascending by expired_at
  for (let i = 1; i < ascResult.data.length; i++) {
    TestValidator.predicate(
      `sessions sorted ascending by expired_at ${i}`,
      ascResult.data[i - 1].expired_at <= ascResult.data[i].expired_at,
    );
  }
  // Test descending sort
  const descReqBody: IShoppingMallAdministratorSession.IRequest = {
    expiredAt: {
      from: expiredFromISOString,
      to: expiredToISOString,
    },
    ip: substringIp,
    page: 1,
    limit: pageSize,
    sort: "expired_at",
  };
  // We simulate descending by reversing the asc array and compare
  const descResult =
    await api.functional.shoppingMall.administrator.sessions.index(
      adminConnection,
      { body: descReqBody },
    );
  typia.assert(descResult);
  // Validate expiredAt range and IP substring for all sessions
  for (const session of descResult.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session expired_at within filter range and ip includes substring: ${session.id}`,
      expiredAt >= fromDate &&
        expiredAt <= toDate &&
        session.ip.includes(substringIp),
    );
  }
  // Validate sorted descending by expired_at (descending order requires reversing and checking)
  for (let i = 1; i < descResult.data.length; i++) {
    TestValidator.predicate(
      `sessions sorted descending by expired_at ${i}`,
      descResult.data[i - 1].expired_at >= descResult.data[i].expired_at,
    );
  }
  // Validate pagination info correctness
  TestValidator.predicate(
    "pagination current page is 1",
    ascResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    ascResult.pagination.limit === pageSize,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    ascResult.pagination.pages > 0,
  );
  TestValidator.predicate(
    "total record count non-negative",
    ascResult.pagination.records >= 0,
  );
}
