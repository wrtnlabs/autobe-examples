import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_retrieval_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account and obtain an authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminSignup = await authorize_administrator_join(connection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(5)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminSignup);
  adminConnection.headers = {
    Authorization: adminSignup.token.access,
  };
  // 2. Retrieve audit logs with no filter to get total count
  const defaultBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdministratorAuditLog.IRequest;
  const defaultResponse =
    await api.functional.shoppingMall.administrator.auditLogs.index(
      adminConnection,
      { body: defaultBody },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default audit log retrieval returns data",
    defaultResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "default audit log pagination current page is 1",
    defaultResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "default audit log pagination limit is 10",
    defaultResponse.pagination.limit === 10,
  );
  // 3. If no logs exist, create a fake audit log by creating another admin to generate an audit log
  if (defaultResponse.pagination.records === 0) {
    await authorize_administrator_join(connection, {
      body: {
        email: `admin+${RandomGenerator.alphaNumeric(5)}@test.com`,
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  }
  // 4. Retrieve audit logs filtered by action (event type)
  const actionFilter: IShoppingMallAdministratorAuditLog.IRequest = {
    action: "create_user",
    page: 1,
    limit: 5,
  };
  const actionFiltered =
    await api.functional.shoppingMall.administrator.auditLogs.index(
      adminConnection,
      { body: actionFilter },
    );
  typia.assert(actionFiltered);
  for (const log of actionFiltered.data) {
    TestValidator.predicate(
      `audit log action filter - item action is ${log.action}`,
      log.action === "create_user",
    );
  }
  // 5. Retrieve audit logs filtered by administratorId (actor type)
  const adminIdFilter: IShoppingMallAdministratorAuditLog.IRequest = {
    administratorId: adminSignup.id,
    page: 1,
    limit: 5,
  };
  const adminIdFiltered =
    await api.functional.shoppingMall.administrator.auditLogs.index(
      adminConnection,
      { body: adminIdFilter },
    );
  typia.assert(adminIdFiltered);
  for (const log of adminIdFiltered.data) {
    TestValidator.equals(
      "audit log administratorId filter - administrator id",
      log.administrator.id,
      adminSignup.id,
    );
  }
  // 6. Retrieve audit logs filtered by createdAt date range
  const nowIso = new Date().toISOString();
  const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const createdFromFilter: IShoppingMallAdministratorAuditLog.IRequest = {
    createdFrom: pastIso,
    createdTo: nowIso,
    page: 1,
    limit: 5,
  };
  const dateRangeFiltered =
    await api.functional.shoppingMall.administrator.auditLogs.index(
      adminConnection,
      { body: createdFromFilter },
    );
  typia.assert(dateRangeFiltered);
  for (const log of dateRangeFiltered.data) {
    TestValidator.predicate(
      "audit log createdFrom filter - log createdAt >= filter createdFrom",
      log.createdAt >= pastIso,
    );
    TestValidator.predicate(
      "audit log createdTo filter - log createdAt <= filter createdTo",
      log.createdAt <= nowIso,
    );
  }
  // 7. Retrieve audit logs filtered by keyword (search text)
  // We'll pick a keyword from the first log description from the default retrieval, if any
  if (defaultResponse.data.length > 0) {
    const firstDescription = defaultResponse.data[0].description;
    if (firstDescription.length >= 3) {
      const keyword = firstDescription.slice(0, 3);
      const keywordFilter: IShoppingMallAdministratorAuditLog.IRequest = {
        keyword,
        page: 1,
        limit: 5,
      };
      const keywordFiltered =
        await api.functional.shoppingMall.administrator.auditLogs.index(
          adminConnection,
          { body: keywordFilter },
        );
      typia.assert(keywordFiltered);
      for (const log of keywordFiltered.data) {
        const foundInDesc = log.description.includes(keyword);
        const foundInIp = log.ip.includes(keyword);
        const foundInUserAgent = log.userAgent.includes(keyword);
        TestValidator.predicate(
          `audit log keyword filter - found keyword '${keyword}' in description or ip or userAgent`,
          foundInDesc || foundInIp || foundInUserAgent,
        );
      }
    }
  }
  // 8. Retrieve audit logs with pagination properties
  const pageSize = 2;
  const paginatedBody: IShoppingMallAdministratorAuditLog.IRequest = {
    page: 1,
    limit: pageSize,
  };
  const page1 = await api.functional.shoppingMall.administrator.auditLogs.index(
    adminConnection,
    { body: paginatedBody },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination records count is >= data length",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pagination pages is correct",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  if (page1.pagination.pages > 1) {
    const page2Body: IShoppingMallAdministratorAuditLog.IRequest = {
      page: 2,
      limit: pageSize,
    };
    const page2 =
      await api.functional.shoppingMall.administrator.auditLogs.index(
        adminConnection,
        { body: page2Body },
      );
    typia.assert(page2);
    // Verify page 1 and page 2 data sets are distinct
    if (page1.data.length > 0 && page2.data.length > 0) {
      for (const item1 of page1.data) {
        for (const item2 of page2.data) {
          TestValidator.notEquals(
            "pagination data items on different pages should differ",
            item1.id,
            item2.id,
          );
        }
      }
    }
  }
  // 9. Verify accessing audit logs endpoint with no authorization fails
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access denied",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.auditLogs.index(
        noAuthConnection,
        {
          body: {
            page: 1,
            limit: 1,
          } satisfies IShoppingMallAdministratorAuditLog.IRequest,
        },
      );
    },
  );
}
