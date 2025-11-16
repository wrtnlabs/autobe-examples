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
 * Validate platform admin listing of seller authentication sessions after
 * completing typical seller authentication flows.
 *
 * Business context:
 *
 * - A platform administrator must be able to inspect authentication sessions for
 *   a specific seller for security and operational analysis.
 * - Seller sessions are created by login flows and are exposed to the platform
 *   admin via PATCH /shoppingMall/platformAdmin/sellers/{sellerId}/sessions.
 *
 * Test flow:
 *
 * 1. Register a platform admin (POST /auth/platformAdmin/join) and obtain an
 *    authorized admin session on the shared connection.
 * 2. Register a seller (POST /auth/seller/join) and capture the seller id.
 * 3. Perform two seller login attempts (POST /auth/seller/login) to create at
 *    least two seller session records.
 * 4. Optionally hit seller email verification and password reset endpoints to
 *    ensure they can be invoked within the same scenario, but without asserting
 *    on token semantics.
 * 5. Re-authenticate as platform admin (POST /auth/platformAdmin/login) so that
 *    subsequent admin-only calls are authorized on the connection.
 * 6. Call PATCH /shoppingMall/platformAdmin/sellers/{sellerId}/sessions with an
 *    IShoppingMallSellerSession.IRequest body using realistic pagination and a
 *    created_at range that should include the above sessions.
 * 7. Assert that:
 *
 *    - Response type conforms to IPageIShoppingMallSellerSession.ISummary.
 *    - Pagination values are non-negative and consistent.
 *    - Every returned seller session summary belongs to the seller id used in the
 *         path parameter.
 *    - Each session's created_at is within the requested time window and, when
 *         expired_at is present, it is not earlier than created_at.
 * 8. Call the same endpoint again with a status filter value (for example,
 *    "active") and assert that the results remain scoped to the seller and that
 *    record counts and datasets are logically consistent.
 */
export async function test_api_platform_admin_list_seller_sessions_after_auth_flows(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authorized session
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphabets(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoin);

  // 2. Register a seller and capture seller id
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphabets(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;

  // 3. Perform two seller login attempts to create sessions
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const firstLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(firstLogin);

  const secondLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(secondLogin);

  // Capture a rough time window around session creation
  const windowStart = new Date();

  // 4. Optional seller email verification and password reset flows
  const emailVerificationIssueBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;
  const emailIssueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      { body: emailVerificationIssueBody },
    );
  typia.assert(emailIssueResponse);

  const passwordResetRequestBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;
  const passwordResetRequestResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      { body: passwordResetRequestBody },
    );
  typia.assert(passwordResetRequestResponse);

  // Use dummy tokens for completion; we do not assert on success semantics.
  const emailVerificationCompleteBody = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallSellerEmailVerificationComplete.IRequest;
  const emailVerificationCompleteResponse: IShoppingMallSellerEmailVerificationComplete.IResponse =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      { body: emailVerificationCompleteBody },
    );
  typia.assert(emailVerificationCompleteResponse);

  const passwordResetCompleteBody = {
    token: RandomGenerator.alphaNumeric(32),
    password: RandomGenerator.alphabets(16),
  } satisfies IShoppingMallSellerPasswordResetComplete.IRequest;
  const passwordResetCompleteResponse: IShoppingMallSellerPasswordResetComplete.IResponse =
    await api.functional.auth.seller.password.reset.complete.completePasswordReset(
      connection,
      { body: passwordResetCompleteBody },
    );
  typia.assert(passwordResetCompleteResponse);

  const windowEnd = new Date();

  // 5. Re-authenticate as platform admin to ensure admin context on connection
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 6. Call seller sessions index as platform admin
  const createdFrom: string & tags.Format<"date-time"> =
    windowStart.toISOString() as string & tags.Format<"date-time">;
  const createdTo: string & tags.Format<"date-time"> =
    windowEnd.toISOString() as string & tags.Format<"date-time">;

  const sessionsRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "created_at",
    orderDirection: "desc",
    created_from: createdFrom,
    created_to: createdTo,
    status: undefined,
    ip_like: undefined,
  } satisfies IShoppingMallSellerSession.IRequest;

  const pageResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: sessionsRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // 7. Validate each session summary
  await ArrayUtil.asyncForEach(pageResult.data, async (session, index) => {
    const summary: IShoppingMallSellerSession.ISummary = session;
    typia.assert(summary);

    TestValidator.equals(
      `session seller id must match target seller (${index})`,
      summary.seller.id,
      sellerId,
    );

    const createdAtTime = new Date(summary.created_at).getTime();
    const fromTime = new Date(createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();

    TestValidator.predicate(
      `session created_at within window (${index})`,
      createdAtTime >= fromTime && createdAtTime <= toTime,
    );

    if (summary.expired_at !== undefined) {
      const expiredAtTime = new Date(summary.expired_at).getTime();
      TestValidator.predicate(
        `expired_at not earlier than created_at (${index})`,
        expiredAtTime >= createdAtTime,
      );
    }
  });

  // 8. Call again with a status filter and compare
  const statusFilteredBody = {
    page: sessionsRequestBody.page,
    limit: sessionsRequestBody.limit,
    orderBy: sessionsRequestBody.orderBy,
    orderDirection: sessionsRequestBody.orderDirection,
    created_from: sessionsRequestBody.created_from,
    created_to: sessionsRequestBody.created_to,
    status: "active",
    ip_like: undefined,
  } satisfies IShoppingMallSellerSession.IRequest;

  const statusFilteredPage: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: statusFilteredBody,
      },
    );
  typia.assert(statusFilteredPage);

  await ArrayUtil.asyncForEach(
    statusFilteredPage.data,
    async (session, index) => {
      const summary: IShoppingMallSellerSession.ISummary = session;
      typia.assert(summary);

      TestValidator.equals(
        `status-filtered session seller id matches (${index})`,
        summary.seller.id,
        sellerId,
      );
    },
  );

  TestValidator.predicate(
    "status-filtered records should not exceed unfiltered records",
    statusFilteredPage.pagination.records <= pageResult.pagination.records,
  );
}
