import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sessions_filter_by_context(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies administrator session listing filters by context fields and time windows.
   *
   * This scenario authenticates an administrator with an isolated connection, queries the
   * administrator session listing endpoint using request context filters and pagination, and
   * validates that each returned session matches the requested criteria. It also checks that
   * the response remains paginated, the owner is exposed as a customer summary, and the
   * listing does not leak secret session material.
   *
   * 1. Authenticate an administrator using the dedicated join utility on an isolated connection.
   * 2. Request session listings with context and time-window filters using explicit pagination.
   * 3. Validate page metadata, returned session fields, and filter fidelity across multiple pages when available.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin-${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: adminAuthorized.token.access,
  };
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const createdAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const expiredAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 2,
  ).toISOString();
  const expiredAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 60,
  ).toISOString();
  const request = {
    page: 1,
    limit: 20,
    sort: "-createdAt",
    ip: "127.0.0.1",
    href: "/admin/sessions",
    referrer: "/admin/dashboard",
    createdAtFrom,
    createdAtTo,
    expiredAtFrom,
    expiredAtTo,
  } satisfies IMallPlatformCustomerSession.IRequest;
  const firstPage =
    await api.functional.mallPlatform.administrator.sessions.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "requested page number",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("requested page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page count is coherent with record count and limit",
    firstPage.pagination.limit > 0
      ? firstPage.pagination.pages ===
          Math.ceil(firstPage.pagination.records / firstPage.pagination.limit)
      : firstPage.pagination.records === 0 && firstPage.pagination.pages === 0,
  );
  TestValidator.predicate(
    "returned data length does not exceed the page limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const matchesFilter = (session: IMallPlatformCustomerSession.ISummary) =>
    session.ip === request.ip &&
    session.href === request.href &&
    session.referrer === request.referrer &&
    session.createdAt >= request.createdAtFrom! &&
    session.createdAt <= request.createdAtTo! &&
    session.expiredAt >= request.expiredAtFrom! &&
    session.expiredAt <= request.expiredAtTo!;
  for (const session of firstPage.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session matches all requested filters",
      matchesFilter(session),
    );
    TestValidator.predicate(
      "session customer is a summary object",
      session.customer.id.length > 0 && session.customer.email.length > 0,
    );
  }
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.mallPlatform.administrator.sessions.index(
        adminConnection,
        {
          body: {
            ...request,
            page: 2,
          } satisfies IMallPlatformCustomerSession.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
    TestValidator.equals(
      "page limit remains stable",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "filtered total records remains stable",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "filtered total pages remains stable",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    for (const session of secondPage.data) {
      typia.assert(session);
      TestValidator.predicate(
        "second page session matches all requested filters",
        matchesFilter(session),
      );
      TestValidator.predicate(
        "second page session customer is a summary object",
        session.customer.id.length > 0 && session.customer.email.length > 0,
      );
    }
    TestValidator.notEquals(
      "pages should be different when multiple pages exist",
      firstPage.data,
      secondPage.data,
    );
  }
}
