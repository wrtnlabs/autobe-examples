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
import type { IShoppingMallSellerEmailVerificationComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationComplete";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate platform admin can filter email verification tokens by time window
 * and pagination.
 *
 * Business flow (adapted to available APIs and DTOs):
 *
 * 1. Register a platform admin via /auth/platformAdmin/join so that subsequent
 *    admin-only calls use a valid Authorization header (SDK manages token).
 * 2. Register a seller via /auth/seller/join and issue multiple seller email
 *    verification tokens using /auth/seller/email/verification/issue.
 *
 *    - This step ensures realistic background data, even though the search endpoint
 *         in this test uses a random authCredentialsId (since it is not exposed
 *         in DTOs).
 * 3. As platform admin, call PATCH
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/emailVerificationTokens
 *    with a rich IShoppingMallEmailVerificationToken.IRequest filter object
 *    (page, pageSize, issuedFrom/To, expiresBefore/After, status, sortBy,
 *    sortOrder).
 * 4. Validate that:
 *
 *    - Response matches IPageIShoppingMallEmailVerificationToken.ISummary.
 *    - Pagination metadata is self-consistent (limit respected, pages and records
 *         non-negative, current within [0, pages)).
 *    - Page size is enforced.
 * 5. If multiple pages exist, request the second page and validate relative
 *    pagination invariants (current increments, limits remain constant).
 */
export async function test_api_platform_admin_filter_email_verification_tokens_by_time_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a platform admin (this also authenticates the connection).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a seller and issue multiple email verification tokens.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Issue a few verification tokens for the seller email.
  const issueCount = 3;
  const issueBodies = ArrayUtil.repeat(issueCount, () => {
    return {
      email: sellerJoinBody.email,
    } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;
  });

  await ArrayUtil.asyncForEach(issueBodies, async (body, index) => {
    const response: IShoppingMallSellerEmailVerificationIssue.IResponse =
      await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
        connection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      `email verification issuance #${index + 1} should succeed`,
      response.success === true,
    );
  });

  // 3. Build a filter request for the platform admin search endpoint.
  const requestedPageSize = 2;

  const nowIso = new Date().toISOString();

  const filterRequest = {
    page: 1,
    pageSize: requestedPageSize,
    status: "pending",
    email: null,
    issuedFrom: null,
    issuedTo: nowIso,
    expiresBefore: null,
    expiresAfter: null,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IShoppingMallEmailVerificationToken.IRequest;

  // Use a random credentials id, as DTOs do not expose the real one.
  const authCredentialsId = typia.random<string & tags.Format<"uuid">>();

  const firstPage: IPageIShoppingMallEmailVerificationToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
      connection,
      {
        authCredentialsId,
        body: filterRequest,
      },
    );
  typia.assert(firstPage);

  // 4. Validate pagination invariants on the first page.
  TestValidator.equals(
    "page size limit should match requested pageSize",
    firstPage.pagination.limit,
    filterRequest.pageSize,
  );

  TestValidator.predicate(
    "records count should be non-negative",
    firstPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages count should be non-negative",
    firstPage.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "current page index should be within valid range",
    firstPage.pagination.current >= 0 &&
      (firstPage.pagination.pages === 0 ||
        firstPage.pagination.current < firstPage.pagination.pages),
  );

  TestValidator.predicate(
    "data length should not exceed page size limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );

  // 5. If there are multiple pages, request the second page and validate.
  if (firstPage.pagination.pages > 1) {
    const secondFilterRequest = {
      ...filterRequest,
      page: (filterRequest.page ?? 1) + 1,
    } satisfies IShoppingMallEmailVerificationToken.IRequest;

    const secondPage: IPageIShoppingMallEmailVerificationToken.ISummary =
      await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
        connection,
        {
          authCredentialsId,
          body: secondFilterRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page index should be first page index + 1",
      secondPage.pagination.current,
      firstPage.pagination.current + 1,
    );

    TestValidator.equals(
      "second page limit should equal requested pageSize",
      secondPage.pagination.limit,
      filterRequest.pageSize,
    );

    TestValidator.predicate(
      "combined data length of first and second page should not exceed records",
      firstPage.data.length + secondPage.data.length <=
        secondPage.pagination.records,
    );
  }

  // 6. Perform another call with a different status and sort by expires_at.
  const altFilterRequest = {
    page: 1,
    pageSize: requestedPageSize,
    status: "expired",
    email: null,
    issuedFrom: null,
    issuedTo: nowIso,
    expiresBefore: null,
    expiresAfter: null,
    sortBy: "expires_at",
    sortOrder: "asc",
  } satisfies IShoppingMallEmailVerificationToken.IRequest;

  const altPage: IPageIShoppingMallEmailVerificationToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
      connection,
      {
        authCredentialsId,
        body: altFilterRequest,
      },
    );
  typia.assert(altPage);

  TestValidator.equals(
    "alt page limit should match requested pageSize",
    altPage.pagination.limit,
    altFilterRequest.pageSize,
  );

  TestValidator.predicate(
    "alt page data length should not exceed page size limit",
    altPage.data.length <= altPage.pagination.limit,
  );

  // Basic structural check on returned token summaries.
  altPage.data.forEach((token, index) => {
    const summary: IShoppingMallEmailVerificationToken.ISummary = token;
    typia.assert(summary);
    TestValidator.predicate(
      `token #${index + 1} should have created_at and expires_at strings`,
      typeof summary.created_at === "string" &&
        typeof summary.expires_at === "string",
    );
  });
}
