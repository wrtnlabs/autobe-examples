import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_customer_filter_by_status_and_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason:
        "Testing admin customer filtering functionality for quality assurance",
      href: "https://example.com/admin",
      referrer: "https://example.com/login",
    },
  });
  // 2. Create test customers with unique email patterns for filtering
  const customerCount = 5;
  for (let i = 0; i < customerCount; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
      body: {
        email: `test.customer.${i}@filter.example.com`,
        password: "TestPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com/",
      },
    });
  }
  // 3. Filter by status='active' only
  const activeOnlyResponse = typia.assert<IPageIEcommerceMallCustomer.ISummary>(
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    }),
  );
  // Verify pagination structure
  TestValidator.equals(
    "pagination has current page",
    activeOnlyResponse.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    activeOnlyResponse.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records count",
    activeOnlyResponse.pagination.pagination.records >= customerCount,
  );
  TestValidator.predicate(
    "pagination has pages",
    activeOnlyResponse.pagination.pagination.pages >= 1,
  );
  // Verify all returned customers are active (deletedAt is null)
  for (const customer of activeOnlyResponse.data) {
    TestValidator.equals(
      "customer is active (deletedAt null)",
      customer.deletedAt,
      null,
    );
  }
  // 4. Filter by status='active' AND search by partial email
  const searchEmailPart = "customer.";
  const filteredResponse = typia.assert<IPageIEcommerceMallCustomer.ISummary>(
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
        search: searchEmailPart,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCustomer.IRequest,
    }),
  );
  // Verify all returned customers have emails containing the search string
  TestValidator.predicate(
    "filtered results contain search term in email",
    filteredResponse.data.length > 0 &&
      filteredResponse.data.every((c: IEcommerceMallCustomer.ISummary) =>
        c.email.includes(searchEmailPart),
      ),
  );
  // Verify all returned customers are active
  for (const customer of filteredResponse.data) {
    TestValidator.equals(
      "filtered customer is active (deletedAt null)",
      customer.deletedAt,
      null,
    );
  }
  // 5. Verify records count reflects filtered results
  TestValidator.predicate(
    "filtered records count <= total active records",
    filteredResponse.pagination.pagination.records <=
      activeOnlyResponse.pagination.pagination.records,
  );
  // 6. Test pagination within filtered results
  const page1Response = typia.assert<IPageIEcommerceMallCustomer.ISummary>(
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
        search: "example.com",
        page: 1,
        limit: 2,
      } satisfies IEcommerceMallCustomer.IRequest,
    }),
  );
  TestValidator.equals(
    "page 1 has limit 2",
    page1Response.pagination.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page 1 current is 1",
    page1Response.pagination.pagination.current,
    1,
  );
  TestValidator.predicate("page 1 has data", page1Response.data.length > 0);
  TestValidator.predicate(
    "page 1 has records",
    page1Response.pagination.pagination.records >= 2,
  );
  // Get page 2 if there are more records
  if (page1Response.pagination.pagination.pages > 1) {
    const page2Response = typia.assert<IPageIEcommerceMallCustomer.ISummary>(
      await api.functional.ecommerceMall.admin.customers.index(
        adminConnection,
        {
          body: {
            status: "active",
            search: "example.com",
            page: 2,
            limit: 2,
          } satisfies IEcommerceMallCustomer.IRequest,
        },
      ),
    );
    TestValidator.equals(
      "page 2 current is 2",
      page2Response.pagination.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit is 2",
      page2Response.pagination.pagination.limit,
      2,
    );
    // Verify page 2 data is different from page 1
    const page1Ids = page1Response.data.map(
      (c: IEcommerceMallCustomer.ISummary) => c.id,
    );
    const page2Ids = page2Response.data.map(
      (c: IEcommerceMallCustomer.ISummary) => c.id,
    );
    TestValidator.predicate(
      "page 2 has different customers than page 1",
      !page1Ids.some((id: string) => page2Ids.includes(id)),
    );
  }
}
