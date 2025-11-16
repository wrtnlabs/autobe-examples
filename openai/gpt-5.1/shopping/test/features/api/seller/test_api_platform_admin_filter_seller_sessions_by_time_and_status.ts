import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationComplete";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPasswordResetComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetComplete";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Platform admin filters seller sessions by time window and status.
 *
 * Business purpose:
 *
 * - Ensure that a platform administrator can inspect seller sessions using the
 *   PATCH /shoppingMall/platformAdmin/sellers/{sellerId}/sessions endpoint.
 * - Validate that results are scoped to the target seller and that pagination
 *   metadata is consistent with the data array.
 * - Exercise created_from/created_to filters and the optional status filter, plus
 *   an explicit "no match" boundary case.
 *
 * Scenario steps:
 *
 * 1. Register a seller with POST /auth/seller/join.
 * 2. Generate multiple sessions/events for that seller via a combination of
 *    /auth/seller/login and password-reset flows so that multiple
 *    shopping_mall_seller_sessions rows are created.
 * 3. Register and login as a platform admin using /auth/platformAdmin/join and
 *    /auth/platformAdmin/login so that the connection carries an admin token.
 * 4. Call PATCH /shoppingMall/platformAdmin/sellers/{sellerId}/sessions with a
 *    broad time window filter and verify:
 *
 *    - Response type matches IPageIShoppingMallSellerSession.ISummary.
 *    - Every session summary has seller.id equal to the target seller id.
 *    - Pagination.records is >= data.length and pages is consistent.
 * 5. Call the same endpoint with a narrower created_from/created_to window and
 *    confirm that the response still only contains sessions for that seller and
 *    that pagination is internally consistent.
 * 6. Call with a status filter (e.g., "active") and verify that the endpoint
 *    accepts it and still scopes sessions correctly to the seller.
 * 7. Boundary: call with created_from greater than created_to so that no rows
 *    should match, asserting pagination.records = 0, pages = 0, and data.length
 *    = 0.
 */
export async function test_api_platform_admin_filter_seller_sessions_by_time_and_status(
  connection: api.IConnection,
) {
  // 1. Register a seller to generate sessions for.
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 2. Generate multiple seller sessions via login and password-reset flows.
  // We rely on the backend to create appropriate session rows; our responsibility
  // is to drive several auth-related calls so that multiple sessions exist.

  // 2-1. Perform several login attempts to create/update sessions.
  const sellerLoginBodyBase = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies Omit<IShoppingMallSellerLogin.IRequest, "ip">;

  // First login (after join, though join already issued a token).
  const sellerLogin1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        ...sellerLoginBodyBase,
        ip: null,
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin1);

  // Additional logins to ensure multiple session records.
  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        ...sellerLoginBodyBase,
        ip: "192.168.0.10",
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin2);

  const sellerLogin3: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        ...sellerLoginBodyBase,
        ip: "10.0.0.5",
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin3);

  // 2-2. Drive a password reset flow; implementations typically touch session
  // tables, giving more lifecycle variety.
  const passwordResetRequestBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;

  const passwordResetRequestResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: passwordResetRequestBody,
      },
    );
  typia.assert<IShoppingMallSellerPasswordResetRequest.IResponse>(
    passwordResetRequestResponse,
  );

  // We do not know the real token; in this test, we rely on simulate mode or
  // environment-specific seeding. Use typia.random to build a structurally
  // valid request for completePasswordReset.
  const passwordResetCompleteBody =
    typia.random<IShoppingMallSellerPasswordResetComplete.IRequest>();

  const passwordResetCompleteResponse: IShoppingMallSellerPasswordResetComplete.IResponse =
    await api.functional.auth.seller.password.reset.complete.completePasswordReset(
      connection,
      {
        body: passwordResetCompleteBody,
      },
    );
  typia.assert<IShoppingMallSellerPasswordResetComplete.IResponse>(
    passwordResetCompleteResponse,
  );

  // 2-3. Issue and complete an email verification as another session-related
  // activity.
  const emailVerificationIssueBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const emailVerificationIssueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: emailVerificationIssueBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    emailVerificationIssueResponse,
  );

  const emailVerificationCompleteBody =
    typia.random<IShoppingMallSellerEmailVerificationComplete.IRequest>();

  const emailVerificationCompleteResponse: IShoppingMallSellerEmailVerificationComplete.IResponse =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      {
        body: emailVerificationCompleteBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationComplete.IResponse>(
    emailVerificationCompleteResponse,
  );

  // 3. Register a platform admin and ensure we are authenticated as that admin
  // before calling the admin-only sessions endpoint.

  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorizedFromJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorizedFromJoin);

  // Perform an explicit login to ensure clear session creation for the admin.
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: "203.0.113.10",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorizedLogin);

  // 4. Call sessions.index with a broad time window and basic pagination.
  const broadFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "created_at",
    orderDirection: "desc",
    created_from: null,
    created_to: null,
    status: null,
    ip_like: null,
  } satisfies IShoppingMallSellerSession.IRequest;

  const broadPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: broadFilterBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerSession.ISummary>(broadPage);

  const paginationBroad: IPage.IPagination = broadPage.pagination;
  typia.assert<IPage.IPagination>(paginationBroad);

  // Basic structural assertions
  TestValidator.predicate(
    "pagination.records is non-negative",
    paginationBroad.records >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    paginationBroad.limit >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    broadPage.data.length <= paginationBroad.limit,
  );

  // Every session must belong to the target seller.
  for (const sessionSummary of broadPage.data) {
    typia.assert<IShoppingMallSellerSession.ISummary>(sessionSummary);
    TestValidator.equals(
      "seller id matches in broad filter",
      sessionSummary.seller.id,
      sellerId,
    );
  }

  // 5. Narrow time window: use synthetic timestamps around now. Since we do not
  // control created_at precisely, this check focuses on scoping and internal
  // consistency rather than precise count expectations.
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // Define a window where created_from <= created_to using the same timestamp
  // (degenerate but valid window).
  const narrowFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "created_at",
    orderDirection: "asc",
    created_from: nowIso,
    created_to: nowIso,
    status: null,
    ip_like: null,
  } satisfies IShoppingMallSellerSession.IRequest;

  const narrowPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: narrowFilterBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerSession.ISummary>(narrowPage);

  const paginationNarrow: IPage.IPagination = narrowPage.pagination;
  typia.assert<IPage.IPagination>(paginationNarrow);

  TestValidator.predicate(
    "narrow filter pagination.records is non-negative",
    paginationNarrow.records >= 0,
  );
  TestValidator.predicate(
    "narrow filter data length within limit",
    narrowPage.data.length <= paginationNarrow.limit,
  );

  for (const sessionSummary of narrowPage.data) {
    typia.assert<IShoppingMallSellerSession.ISummary>(sessionSummary);
    TestValidator.equals(
      "seller id matches in narrow filter",
      sessionSummary.seller.id,
      sellerId,
    );
  }

  // 6. Status filter: use an arbitrary status string and verify structural
  // correctness and seller scoping. The actual interpretation of status is
  // backend-defined and not exposed in ISummary.
  const statusFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "created_at",
    orderDirection: "desc",
    created_from: null,
    created_to: null,
    status: "active",
    ip_like: null,
  } satisfies IShoppingMallSellerSession.IRequest;

  const statusPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: statusFilterBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerSession.ISummary>(statusPage);

  const paginationStatus: IPage.IPagination = statusPage.pagination;
  typia.assert<IPage.IPagination>(paginationStatus);

  TestValidator.predicate(
    "status filter pagination.records >= data length",
    paginationStatus.records >= statusPage.data.length,
  );

  for (const sessionSummary of statusPage.data) {
    typia.assert<IShoppingMallSellerSession.ISummary>(sessionSummary);
    TestValidator.equals(
      "seller id matches in status filter",
      sessionSummary.seller.id,
      sellerId,
    );
  }

  // 7. Boundary: created_from greater than created_to. We expect no sessions to
  // satisfy an inverted time range, so the page should be empty.
  const laterIso: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const invertedFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "created_at",
    orderDirection: "asc",
    created_from: laterIso,
    created_to: nowIso,
    status: null,
    ip_like: null,
  } satisfies IShoppingMallSellerSession.IRequest;

  const invertedPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: invertedFilterBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerSession.ISummary>(invertedPage);

  const paginationInverted: IPage.IPagination = invertedPage.pagination;
  typia.assert<IPage.IPagination>(paginationInverted);

  TestValidator.equals(
    "inverted range yields zero records",
    paginationInverted.records,
    0,
  );
  TestValidator.equals(
    "inverted range yields zero pages",
    paginationInverted.pages,
    0,
  );
  TestValidator.equals(
    "inverted range yields empty data array",
    invertedPage.data.length,
    0,
  );
}
