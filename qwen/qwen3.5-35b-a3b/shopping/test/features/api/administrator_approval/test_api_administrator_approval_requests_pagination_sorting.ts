import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_requests_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  typia.assert(superAdminAuth.superAdministrator);
  // 2. Create 16 customer accounts as requesters
  const customerConnections: api.IConnection[] = [];
  const customers: IEcommerceMallMember.IAuthorized[] = [];
  const customerIds: string[] = [];
  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(16, () => ({ index: 0 })),
    async (_, index) => {
      const customerConn: api.IConnection = { host: connection.host };
      const customerAuth = await authorize_member_join(customerConn, {
        body: {
          email: `customer_${index}_${typia.random<string & tags.Format<"email">>()}`,
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
      typia.assert(customerAuth);
      customerConnections.push(customerConn);
      customers.push(customerAuth);
      customerIds.push(customerAuth.id);
    },
  );
  // 3. Submit administrator approval requests from each customer
  const allRequests: IEcommerceMallAdministratorApprovalRequests[] = [];
  const requestIds: string[] = [];
  // Submit first 10 requests immediately
  for (let i = 0; i < 10; i++) {
    const requestId =
      await api.functional.ecommerceMall.member.administrator_approval_requests.create(
        customerConnections[i],
        {
          body: {
            requestingMemberId: customerIds[i],
            reason: `Request ${i + 1}: Seeking administrator privileges to help manage platform operations`,
          },
        },
      );
    typia.assert(requestId);
    allRequests.push(requestId);
    requestIds.push(requestId.id);
  }
  // Add small delay to create timestamp variance for sorting validation
  await ArrayUtil.asyncRepeat(6, async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  // Submit remaining 6 requests
  for (let i = 10; i < 16; i++) {
    const requestId =
      await api.functional.ecommerceMall.member.administrator_approval_requests.create(
        customerConnections[i],
        {
          body: {
            requestingMemberId: customerIds[i],
            reason: `Request ${i + 1}: Different reason for administrator access at a later time`,
          },
        },
      );
    typia.assert(requestId);
    allRequests.push(requestId);
    requestIds.push(requestId.id);
  }
  // 4. Test default pagination (limit=20)
  const defaultPaginationResult =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 20,
          sortOrder: "newest_first",
        },
      },
    );
  typia.assert(defaultPaginationResult);
  typia.assert(defaultPaginationResult.pagination);
  typia.assert(defaultPaginationResult.data);
  TestValidator.equals(
    "default limit=20",
    defaultPaginationResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default records count",
    defaultPaginationResult.pagination.records,
    16,
  );
  TestValidator.equals(
    "default pages count",
    defaultPaginationResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "default current page",
    defaultPaginationResult.pagination.current,
    1,
  );
  // 5. Test cursor-based pagination with limit=5
  const firstPage =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          sortOrder: "newest_first",
        },
      },
    );
  typia.assert(firstPage);
  typia.assert(firstPage.pagination);
  typia.assert(firstPage.data);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.equals("first page records", firstPage.pagination.records, 16);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 4);
  // Fetch second page using last item's ID as cursor
  const secondPage =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          sortOrder: "newest_first",
          cursor: firstPage.data[firstPage.data.length - 1].id,
        },
      },
    );
  typia.assert(secondPage);
  typia.assert(secondPage.pagination);
  typia.assert(secondPage.data);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  // Fetch third page
  const thirdPage =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          sortOrder: "newest_first",
          cursor: secondPage.data[secondPage.data.length - 1].id,
        },
      },
    );
  typia.assert(thirdPage);
  typia.assert(thirdPage.pagination);
  typia.assert(thirdPage.data);
  TestValidator.equals("third page limit", thirdPage.pagination.limit, 5);
  TestValidator.equals("third page current", thirdPage.pagination.current, 3);
  // Fetch fourth page (last page)
  const fourthPage =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          sortOrder: "newest_first",
          cursor: thirdPage.data[thirdPage.data.length - 1].id,
        },
      },
    );
  typia.assert(fourthPage);
  typia.assert(fourthPage.pagination);
  typia.assert(fourthPage.data);
  TestValidator.equals("fourth page limit", fourthPage.pagination.limit, 5);
  TestValidator.equals("fourth page current", fourthPage.pagination.current, 4);
  // Verify no duplicate records across pages
  const allPageIds = [
    ...firstPage.data.map((r) => r.id),
    ...secondPage.data.map((r) => r.id),
    ...thirdPage.data.map((r) => r.id),
    ...fourthPage.data.map((r) => r.id),
  ];
  const uniqueIds = new Set(allPageIds);
  TestValidator.equals(
    "no duplicate records",
    uniqueIds.size,
    allPageIds.length,
  );
  // 6. Test oldest_first sorting
  const oldestFirst =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 20,
          sortOrder: "oldest_first",
        },
      },
    );
  typia.assert(oldestFirst);
  typia.assert(oldestFirst.pagination);
  typia.assert(oldestFirst.data);
  TestValidator.equals("oldest_first limit", oldestFirst.pagination.limit, 20);
  TestValidator.equals(
    "oldest_first records",
    oldestFirst.pagination.records,
    16,
  );
  // Verify oldest_first sorting (created_at ASC)
  for (let i = 0; i < oldestFirst.data.length - 1; i++) {
    const curr = oldestFirst.data[i];
    const next = oldestFirst.data[i + 1];
    const currDate = new Date(curr.created_at);
    const nextDate = new Date(next.created_at);
    TestValidator.predicate(`oldest_first order ${i}`, currDate <= nextDate);
  }
  // 7. Test limit=1 edge case
  const singleRecord =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 1,
          sortOrder: "newest_first",
        },
      },
    );
  typia.assert(singleRecord);
  typia.assert(singleRecord.pagination);
  typia.assert(singleRecord.data);
  TestValidator.equals("single record limit", singleRecord.pagination.limit, 1);
  TestValidator.equals(
    "single record data length",
    singleRecord.data.length,
    1,
  );
  TestValidator.equals(
    "single record records",
    singleRecord.pagination.records,
    16,
  );
  TestValidator.equals(
    "single record pages",
    singleRecord.pagination.pages,
    16,
  );
  // 8. Test limit=100 (max) edge case
  const maxLimit =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
          sortOrder: "newest_first",
        },
      },
    );
  typia.assert(maxLimit);
  typia.assert(maxLimit.pagination);
  typia.assert(maxLimit.data);
  TestValidator.equals("max limit enforced", maxLimit.pagination.limit, 100);
  TestValidator.equals("max limit data length", maxLimit.data.length, 16);
  TestValidator.equals("max limit records", maxLimit.pagination.records, 16);
  TestValidator.equals("max limit pages", maxLimit.pagination.pages, 1);
  // 9. Test page-based pagination
  const pageBased =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 5,
          page: 2,
          sortOrder: "newest_first",
        },
      },
    );
  typia.assert(pageBased);
  typia.assert(pageBased.pagination);
  typia.assert(pageBased.data);
  TestValidator.equals("page-based current", pageBased.pagination.current, 2);
  TestValidator.equals("page-based records", pageBased.pagination.records, 16);
  // 10. Test with status filter
  const filteredByStatus =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 20,
          status: "pending",
        },
      },
    );
  typia.assert(filteredByStatus);
  typia.assert(filteredByStatus.pagination);
  typia.assert(filteredByStatus.data);
  TestValidator.equals(
    "filtered records count",
    filteredByStatus.pagination.records,
    16,
  );
  TestValidator.equals(
    "filtered data length",
    filteredByStatus.data.length,
    16,
  );
  // Verify all returned records are pending
  for (const record of filteredByStatus.data) {
    TestValidator.equals("record status pending", record.status, "pending");
  }
}
