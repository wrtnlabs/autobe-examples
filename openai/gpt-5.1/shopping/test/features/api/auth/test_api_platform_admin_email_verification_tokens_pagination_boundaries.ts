import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEmailVerificationToken";
import type { IShoppingMallEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerificationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_email_verification_tokens_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Platform admin join (initial registration)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 1-b. Explicit login to validate login path and refresh token
  const adminLoginBody = {
    email: joinedAdmin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loggedInAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 2. Prepare a random authCredentialsId and base search body
  const authCredentialsId = typia.random<string & tags.Format<"uuid">>();

  const baseRequest = {
    page: 1,
    pageSize: 10,
  } satisfies IShoppingMallEmailVerificationToken.IRequest;

  // 3. Page 1 request
  const page1: IPageIShoppingMallEmailVerificationToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
      connection,
      {
        authCredentialsId,
        body: baseRequest,
      },
    );
  typia.assert(page1);

  const page1Pagination = page1.pagination;
  const page1Data = page1.data;

  // Basic invariants about pagination and data on page 1
  TestValidator.predicate(
    "page1 current page index should be >= 0",
    page1Pagination.current >= 0,
  );
  TestValidator.predicate(
    "page1 limit should be >= 0",
    page1Pagination.limit >= 0,
  );
  TestValidator.predicate(
    "page1 records should be >= 0",
    page1Pagination.records >= 0,
  );
  TestValidator.predicate(
    "page1 pages should be >= 0",
    page1Pagination.pages >= 0,
  );

  if (page1Pagination.records === 0) {
    // When there are no records, there must be no pages and no data
    TestValidator.equals(
      "when no records, pages should be 0",
      page1Pagination.pages,
      0,
    );
    TestValidator.equals(
      "when no records, data length should be 0",
      page1Data.length,
      0,
    );
  } else {
    // When there are records, pages must be at least 1 and data size bounded by limit
    TestValidator.predicate(
      "when records > 0, pages should be at least 1",
      page1Pagination.pages >= 1,
    );
    TestValidator.predicate(
      "page1 data length should be <= limit",
      page1Data.length <= page1Pagination.limit,
    );

    // pages should match ceil(records / limit) according to IPage.IPagination
    if (page1Pagination.limit > 0) {
      const expectedPages = Math.ceil(
        page1Pagination.records / page1Pagination.limit,
      );
      TestValidator.equals(
        "pages should equal ceil(records / limit)",
        page1Pagination.pages,
        expectedPages,
      );
    }
  }

  // 4. Second page behavior when there are multiple pages
  if (page1Pagination.pages > 1) {
    const secondPageRequest = {
      ...baseRequest,
      page: 2,
    } satisfies IShoppingMallEmailVerificationToken.IRequest;

    const page2: IPageIShoppingMallEmailVerificationToken.ISummary =
      await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
        connection,
        {
          authCredentialsId,
          body: secondPageRequest,
        },
      );
    typia.assert(page2);

    const page2Pagination = page2.pagination;
    const page2Data = page2.data;

    TestValidator.predicate(
      "page2 current page index should be within [0, pages-1]",
      page2Pagination.current >= 0 &&
        page2Pagination.current < page2Pagination.pages,
    );
    TestValidator.predicate(
      "page2 data length should be <= limit",
      page2Data.length <= page2Pagination.limit,
    );

    // Combined length of page1 and page2 data cannot exceed total records
    TestValidator.predicate(
      "combined length of first two pages should be <= total records",
      page1Data.length + page2Data.length <= page1Pagination.records,
    );

    if (page1Data.length > 0 && page2Data.length > 0) {
      // Sanity check: first entities of page1 and page2 should generally differ
      TestValidator.notEquals(
        "first entities of page1 and page2 should be different in practice",
        page1Data[0],
        page2Data[0],
      );
    }
  }

  // 5. Out-of-range page behavior
  const outOfRangePageNumber = 999;
  const outOfRangeRequest = {
    ...baseRequest,
    page: outOfRangePageNumber,
  } satisfies IShoppingMallEmailVerificationToken.IRequest;

  const outOfRangePage: IPageIShoppingMallEmailVerificationToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
      connection,
      {
        authCredentialsId,
        body: outOfRangeRequest,
      },
    );
  typia.assert(outOfRangePage);

  const outPagination = outOfRangePage.pagination;
  const outData = outOfRangePage.data;

  TestValidator.predicate(
    "out-of-range current page index should be >= 0",
    outPagination.current >= 0,
  );
  TestValidator.predicate(
    "out-of-range pages should be >= 0",
    outPagination.pages >= 0,
  );

  if (outPagination.records === 0) {
    TestValidator.equals(
      "when no records, out-of-range data length should be 0",
      outData.length,
      0,
    );
  } else if (outPagination.pages > 0) {
    // If there are pages, current should be within valid range and data bounded by limit
    TestValidator.predicate(
      "out-of-range current index should be within [0, pages-1]",
      outPagination.current >= 0 && outPagination.current < outPagination.pages,
    );
    TestValidator.predicate(
      "out-of-range data length should be <= limit",
      outData.length <= outPagination.limit,
    );
  }
}
