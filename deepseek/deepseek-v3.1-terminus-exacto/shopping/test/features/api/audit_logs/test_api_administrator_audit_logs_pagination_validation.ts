import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  console.log("Testing pagination with existing audit logs...");
  // Test pagination with limit 10
  const page1 = await api.functional.ecommerce.administrator.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceAuditLog.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page should be 1", page1.pagination.current, 1);
  TestValidator.equals("limit should be 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 data count should be <= limit",
    page1.data.length <= 10,
  );
  const totalRecords = page1.pagination.records;
  // If there are records, test pagination functionality
  if (totalRecords > 0) {
    // Page 2 - same limit
    const page2 = await api.functional.ecommerce.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceAuditLog.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page should be 2", page2.pagination.current, 2);
    TestValidator.equals("limit should be 10", page2.pagination.limit, 10);
    // Verify total records are consistent between pages
    TestValidator.equals(
      "total records should be consistent",
      page1.pagination.records,
      page2.pagination.records,
    );
    const expectedTotalPages = Math.ceil(totalRecords / 10);
    TestValidator.equals(
      "total pages calculated correctly",
      page1.pagination.pages,
      expectedTotalPages,
    );
    // Test page beyond available data (should be empty)
    if (expectedTotalPages > 1) {
      const beyondPage =
        await api.functional.ecommerce.administrator.audit_logs.index(
          adminConnection,
          {
            body: {
              page: expectedTotalPages + 1,
              limit: 10,
            } satisfies IEcommerceAuditLog.IRequest,
          },
        );
      typia.assert(beyondPage);
      TestValidator.equals(
        "beyond page should be empty",
        beyondPage.data.length,
        0,
      );
      TestValidator.equals(
        "beyond page current should match request",
        beyondPage.pagination.current,
        expectedTotalPages + 1,
      );
    }
  }
  // Test maximum page size (limit 100) - always test this regardless of data
  console.log("Testing maximum page size (limit 100)...");
  const maxPage = await api.functional.ecommerce.administrator.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceAuditLog.IRequest,
    },
  );
  typia.assert(maxPage);
  TestValidator.equals(
    "maximum limit should be 100",
    maxPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max page data count should be <= 100",
    maxPage.data.length <= 100,
  );
  // Validate pagination calculations
  console.log("Validating pagination calculations...");
  TestValidator.predicate(
    "total records should be non-negative",
    totalRecords >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    maxPage.pagination.pages >= 0,
  );
  // Verify mathematical relationship: pages = ceil(records / limit)
  const calculatedPages = Math.ceil(totalRecords / 10);
  TestValidator.equals(
    "pages calculation should match ceil(records/limit)",
    page1.pagination.pages,
    calculatedPages,
  );
  console.log("Pagination validation completed successfully!");
}
