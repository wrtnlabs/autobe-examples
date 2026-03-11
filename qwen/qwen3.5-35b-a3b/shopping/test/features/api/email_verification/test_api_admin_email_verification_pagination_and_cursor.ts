import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerEmailVerification";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_email_verification_pagination_and_cursor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create multiple customer accounts to generate email verification records
  const numCustomers = 25; // More than limit=10 to ensure multiple pages
  for (let i = 0; i < numCustomers; i++) {
    const customerEmail = `customer${i}@test.com`;
    const customerConn: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConn, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  }
  // 3. Create multiple seller accounts to generate email verification records
  const numSellers = 15; // More records to ensure multiple pages
  for (let i = 0; i < numSellers; i++) {
    const sellerEmail = `seller${i}@test.com`;
    const sellerConn: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConn, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  }
  const totalRecords = numCustomers + numSellers; // 40 records total
  // 4. Test with limit=10 and page="1" (first page)
  const limit10 = 10;
  const firstPageCursor: string | undefined = "1";
  const firstPageResponse =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          limit: limit10,
          page: firstPageCursor,
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // 5. Verify first page metadata
  TestValidator.equals(
    "first page current",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPageResponse.pagination.limit,
    limit10,
  );
  TestValidator.equals(
    "first page total records",
    firstPageResponse.pagination.records,
    totalRecords,
  );
  const expectedPages10 = Math.ceil(totalRecords / limit10);
  TestValidator.equals(
    "first page total pages",
    firstPageResponse.pagination.pages,
    expectedPages10,
  );
  TestValidator.equals(
    "first page data length",
    firstPageResponse.data.length,
    limit10,
  );
  // 6. Navigate to second page using cursor from first page
  const secondPageCursor = firstPageResponse.pagination.current + 1; // page="2"
  const secondPageResponse =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          limit: limit10,
          page: String(secondPageCursor),
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // 7. Verify no duplicates between first and second page
  const firstPageIds = new Set(firstPageResponse.data.map((r) => r.id));
  const secondPageIds = new Set(secondPageResponse.data.map((r) => r.id));
  secondPageResponse.data.forEach((record) => {
    TestValidator.predicate(
      "no duplicate record id in second page",
      !firstPageIds.has(record.id),
    );
  });
  // Verify second page metadata
  TestValidator.equals(
    "second page current",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageResponse.pagination.limit,
    limit10,
  );
  TestValidator.equals(
    "second page total records",
    secondPageResponse.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "second page total pages",
    secondPageResponse.pagination.pages,
    expectedPages10,
  );
  TestValidator.equals(
    "second page data length",
    secondPageResponse.data.length,
    limit10,
  );
  // 8. Navigate through all remaining pages
  const allRecordIds: string[] = [...firstPageResponse.data.map((r) => r.id)];
  for (let page = 3; page <= expectedPages10; page++) {
    const pageResponse =
      await api.functional.ecommerceMall.admin.email_verifications.index(
        adminConnection,
        {
          body: {
            limit: limit10,
            page: String(page),
          } satisfies IEcommerceMallSellerEmailVerification.IRequest,
        },
      );
    typia.assert(pageResponse);
    TestValidator.equals(
      `page ${page} current`,
      pageResponse.pagination.current,
      page,
    );
    TestValidator.equals(
      `page ${page} limit`,
      pageResponse.pagination.limit,
      limit10,
    );
    TestValidator.equals(
      `page ${page} total records`,
      pageResponse.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      `page ${page} total pages`,
      pageResponse.pagination.pages,
      expectedPages10,
    );
    // Verify no duplicates across all pages
    pageResponse.data.forEach((record) => {
      TestValidator.predicate(
        `no duplicate record id in page ${page}`,
        !allRecordIds.includes(record.id),
      );
    });
    // Collect all record IDs
    allRecordIds.push(...pageResponse.data.map((r) => r.id));
  }
  // 9. Verify last page returns remaining records
  const lastPage = expectedPages10;
  const lastPageResponse =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          limit: limit10,
          page: String(lastPage),
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(lastPageResponse);
  TestValidator.equals(
    "last page current",
    lastPageResponse.pagination.current,
    lastPage,
  );
  const expectedLastPageCount = totalRecords % limit10;
  const lastPageCount =
    expectedLastPageCount === 0 ? limit10 : expectedLastPageCount;
  TestValidator.equals(
    "last page data length",
    lastPageResponse.data.length,
    lastPageCount,
  );
  // 10. Test with different limit values (5, 25, 50)
  const testLimits = [5, 25, 50];
  for (const testLimit of testLimits) {
    if (testLimit > totalRecords) continue; // Skip if limit exceeds total records
    const testPageResponse =
      await api.functional.ecommerceMall.admin.email_verifications.index(
        adminConnection,
        {
          body: {
            limit: testLimit,
            page: String(1),
          } satisfies IEcommerceMallSellerEmailVerification.IRequest,
        },
      );
    typia.assert(testPageResponse);
    TestValidator.equals(
      `limit ${testLimit} current`,
      testPageResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${testLimit} limit`,
      testPageResponse.pagination.limit,
      testLimit,
    );
    TestValidator.equals(
      `limit ${testLimit} total records`,
      testPageResponse.pagination.records,
      totalRecords,
    );
    const expectedPages = Math.ceil(totalRecords / testLimit);
    TestValidator.equals(
      `limit ${testLimit} total pages`,
      testPageResponse.pagination.pages,
      expectedPages,
    );
    // Verify record count
    const expectedFirstPageCount = Math.min(testLimit, totalRecords);
    TestValidator.equals(
      `limit ${testLimit} data length`,
      testPageResponse.data.length,
      expectedFirstPageCount,
    );
  }
  // 11. Verify pagination metadata accurately reflects total count at each page
  TestValidator.equals(
    "pagination records matches total",
    firstPageResponse.pagination.records,
    allRecordIds.length,
  );
  // 12. Verify page numbers are 1-indexed (already verified above)
  // 13. Verify cursor tokens uniquely identify each page position
  const pageResponses: IPageIEcommerceMallSellerEmailVerification.ISummary[] =
    [];
  for (let page = 1; page <= expectedPages10; page++) {
    const response =
      await api.functional.ecommerceMall.admin.email_verifications.index(
        adminConnection,
        {
          body: {
            limit: limit10,
            page: String(page),
          } satisfies IEcommerceMallSellerEmailVerification.IRequest,
        },
      );
    typia.assert(response);
    pageResponses.push(response);
  }
  // Each page should return different set of IDs
  const allIdsAcrossTests: Set<string> = new Set();
  pageResponses.forEach((response) => {
    response.data.forEach((record) => {
      TestValidator.predicate(
        "unique record id across all pages",
        !allIdsAcrossTests.has(record.id),
      );
      allIdsAcrossTests.add(record.id);
    });
  });
  // 14. Test edge case: single page scenario when total records < limit
  const singlePageLimit = totalRecords + 10; // Limit exceeds total records
  const singlePageResponse =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          limit: singlePageLimit,
          page: String(1),
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(singlePageResponse);
  TestValidator.equals(
    "single page current",
    singlePageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "single page limit",
    singlePageResponse.pagination.limit,
    singlePageLimit,
  );
  TestValidator.equals(
    "single page total records",
    singlePageResponse.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "single page total pages",
    singlePageResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "single page returns all records",
    singlePageResponse.data.length,
    totalRecords,
  );
}