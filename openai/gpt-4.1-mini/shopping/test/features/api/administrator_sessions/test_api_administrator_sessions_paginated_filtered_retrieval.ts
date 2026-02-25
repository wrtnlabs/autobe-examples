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

export async function test_api_administrator_sessions_paginated_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword",
    },
  });
  typia.assert(adminJoinOutput);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminJoinOutput.token.access;
  // 2. Retrieve sessions without filters (default pagination and sort)
  let filterBody: IShoppingMallAdministratorSession.IRequest = {};
  let response = await api.functional.shoppingMall.administrator.sessions.index(
    adminConnection,
    {
      body: filterBody,
    },
  );
  typia.assert(response);
  // Validate pagination initial response
  TestValidator.predicate(
    "pagination current page should be at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit should be a positive number",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    response.pagination.pages >= 0,
  );
  // Validate each session object
  if (response.data.length > 0) {
    for (const session of response.data) {
      typia.assert(session);
      typia.assert(session.administrator);
      TestValidator.predicate(
        "session id format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          session.id,
        ),
      );
      TestValidator.predicate(
        "administrator id format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          session.administrator.id,
        ),
      );
      TestValidator.predicate(
        "ip is not empty",
        session.ip.length > 0 && typeof session.ip === "string",
      );
      TestValidator.predicate(
        "href is not empty",
        session.href.length > 0 && typeof session.href === "string",
      );
      TestValidator.predicate(
        "referrer is not empty",
        session.referrer.length > 0 && typeof session.referrer === "string",
      );
      TestValidator.predicate(
        "created_at is valid ISO date",
        !isNaN(Date.parse(session.created_at)),
      );
      TestValidator.predicate(
        "expired_at is valid ISO date",
        !isNaN(Date.parse(session.expired_at)),
      );
    }
  }
  // 3. Test filter by administratorId
  if (response.data.length > 0) {
    const adminIdToFilter = response.data[0].administrator.id;
    filterBody = { administratorId: adminIdToFilter };
    response = await api.functional.shoppingMall.administrator.sessions.index(
      adminConnection,
      { body: filterBody },
    );
    typia.assert(response);
    for (const session of response.data) {
      TestValidator.equals(
        "filtered administrator id matches",
        session.administrator.id,
        adminIdToFilter,
      );
    }
  }
  // 4. Test filter by IP substring
  if (response.data.length > 0) {
    const ipSample = response.data[0].ip;
    if (ipSample.length >= 3) {
      const ipFilter = ipSample.substring(0, 3);
      filterBody = { ip: ipFilter };
      response = await api.functional.shoppingMall.administrator.sessions.index(
        adminConnection,
        { body: filterBody },
      );
      typia.assert(response);
      for (const session of response.data) {
        TestValidator.predicate(
          "ip contains filter substring",
          session.ip.includes(ipFilter),
        );
      }
    }
  }
  // 5. Test filter by expiredAt range
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  filterBody = {
    expiredAt: {
      from: now.toISOString(),
      to: tomorrow.toISOString(),
    },
    page: 1,
    limit: 5,
    sort: "created_at",
  };
  response = await api.functional.shoppingMall.administrator.sessions.index(
    adminConnection,
    { body: filterBody },
  );
  typia.assert(response);
  for (const session of response.data) {
    const expiredDate = new Date(session.expired_at);
    TestValidator.predicate(
      "expiredAt within range",
      expiredDate >= now && expiredDate <= tomorrow,
    );
  }
  // 6. Test pagination behavior - different page and limit
  filterBody = { page: 2, limit: 3, sort: "created_at" };
  const secondPageResponse =
    await api.functional.shoppingMall.administrator.sessions.index(
      adminConnection,
      { body: filterBody },
    );
  typia.assert(secondPageResponse);
  TestValidator.predicate(
    "pagination current page should be 2",
    secondPageResponse.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit should be 3",
    secondPageResponse.pagination.limit === 3,
  );
  TestValidator.predicate(
    "sorted by created_at",
    secondPageResponse.data.every(
      (a, i, arr) =>
        i === 0 || new Date(arr[i - 1].created_at) >= new Date(a.created_at),
    ),
  );
}
