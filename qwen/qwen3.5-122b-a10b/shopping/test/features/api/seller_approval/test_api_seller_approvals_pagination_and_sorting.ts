import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approvals_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for accessing seller approvals endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate multiple seller accounts with different approval statuses
  const sellers = await ArrayUtil.asyncRepeat(25, async (index) => {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerData = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: "https://test.com/register",
        referrer: "https://test.com",
      } satisfies IEcommerceSeller.IJoin,
    });
    typia.assert(sellerData);
    return sellerData;
  });
  // Test 1: Default pagination (limit 20)
  const defaultPage = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 20);
  TestValidator.predicate("has records", defaultPage.pagination.records > 0);
  TestValidator.predicate("has pages", defaultPage.pagination.pages > 0);
  TestValidator.equals("current page is 1", defaultPage.pagination.current, 1);
  TestValidator.predicate(
    "data array length matches limit or remaining",
    defaultPage.data.length <= defaultPage.pagination.limit,
  );
  // Test 2: Custom limit (max 100)
  const customLimit = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(customLimit);
  TestValidator.equals(
    "custom limit respected",
    customLimit.pagination.limit,
    100,
  );
  TestValidator.equals(
    "all records on one page",
    customLimit.data.length,
    customLimit.pagination.records,
  );
  // Test 3: Page navigation
  const page2 = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.predicate("page 2 has records", page2.data.length > 0);
  // Test 4: Sorting by createdAt ascending
  const ascSort = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "asc",
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(ascSort);
  // Verify ascending order
  for (let i = 1; i < ascSort.data.length; i++) {
    TestValidator.predicate(
      `asc sort: record ${i - 1} created before record ${i}`,
      ascSort.data[i - 1].created_at <= ascSort.data[i].created_at,
    );
  }
  // Test 5: Sorting by createdAt descending
  const descSort = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(descSort);
  // Verify descending order
  for (let i = 1; i < descSort.data.length; i++) {
    TestValidator.predicate(
      `desc sort: record ${i - 1} created after record ${i}`,
      descSort.data[i - 1].created_at >= descSort.data[i].created_at,
    );
  }
  // Test 6: Sorting by status
  const statusSort = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 50,
        sortBy: "status",
        sortOrder: "asc",
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(statusSort);
  // Verify status grouping
  for (let i = 1; i < statusSort.data.length; i++) {
    TestValidator.predicate(
      `status sort: record ${i - 1} status <= record ${i}`,
      statusSort.data[i - 1].status <= statusSort.data[i].status,
    );
  }
  // Test 7: Pagination metadata accuracy
  const metadataTest = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(metadataTest);
  const expectedPages = Math.ceil(metadataTest.pagination.records / 5);
  TestValidator.equals(
    "pages calculation",
    metadataTest.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "records count matches data across pages",
    metadataTest.pagination.records >= metadataTest.data.length,
  );
  // Test 8: Sequential page retrieval
  const totalPages = metadataTest.pagination.pages;
  const allRecords: IEcommerceSellerApproval.ISummary[] = [];
  await ArrayUtil.asyncForEach(
    Array.from({ length: totalPages }, (_, i) => i + 1),
    async (pageNum) => {
      const page = await api.functional.ecommerce.seller.approvals.index(
        adminConnection,
        {
          body: {
            page: pageNum,
            limit: 5,
          } satisfies IEcommerceSellerApproval.IRequest,
        },
      );
      typia.assert(page);
      TestValidator.equals(
        `page ${pageNum} current`,
        page.pagination.current,
        pageNum,
      );
      allRecords.push(...page.data);
    },
  );
  TestValidator.equals(
    "total records across all pages",
    allRecords.length,
    metadataTest.pagination.records,
  );
  // Test 9: Last page validation
  const lastPage = await api.functional.ecommerce.seller.approvals.index(
    adminConnection,
    {
      body: {
        page: totalPages,
        limit: 5,
      } satisfies IEcommerceSellerApproval.IRequest,
    },
  );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page current",
    lastPage.pagination.current,
    totalPages,
  );
  TestValidator.predicate("last page has records", lastPage.data.length > 0);
  TestValidator.predicate(
    "last page records <= limit",
    lastPage.data.length <= 5,
  );
}
