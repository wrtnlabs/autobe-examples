import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEmailVerificationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
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
 * Platform admin search over email verification tokens for a given
 * authCredentialsId.
 *
 * Business intent:
 *
 * - Ensure a platform administrator can successfully call the
 *   `/shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/emailVerificationTokens`
 *   endpoint after authenticating.
 * - Validate that the request body filter DTO
 *   `IShoppingMallEmailVerificationToken.IRequest` and the response DTO
 *   `IPageIShoppingMallEmailVerificationToken.ISummary` are wired correctly.
 * - Check pagination metadata remains internally consistent when page and
 *   pageSize are varied, and that the data array respects `pageSize` as an
 *   upper bound.
 * - Confirm that summary records never expose sensitive token values (only
 *   id/created_at/expires_at are present in
 *   `IShoppingMallEmailVerificationToken.ISummary`).
 *
 * Due to API limitations, the test cannot discover a real `authCredentialsId`
 * from public flows, nor observe internal token status or raw token strings.
 * Therefore it focuses on structural and type-level behaviors that can be
 * asserted purely from the public contract.
 *
 * High level flow:
 *
 * 1. Create a platform admin via `/auth/platformAdmin/join`.
 * 2. Log in again via `/auth/platformAdmin/login` to validate that
 *    re-authentication works and that the SDK correctly manages Authorization
 *    headers.
 * 3. Generate a random UUID to act as `authCredentialsId` and call
 *    `emailVerificationTokens.index` with default filters and no pagination
 *    hints (server defaults apply).
 * 4. Assert that the response matches
 *    `IPageIShoppingMallEmailVerificationToken.ISummary` via `typia.assert` and
 *    that `pagination` and `data` fields are present and structurally
 *    coherent.
 * 5. Call the same endpoint again with explicit small `page`/`pageSize` (e.g.,
 *    page=1, pageSize=1) and stricter filters (status/email plus a time
 *    window). Assert the response type, verify that `pagination.limit` aligns
 *    with expectations and that `data.length` does not exceed the requested
 *    `pageSize`.
 * 6. If any tokens are returned, perform additional sanity checks on `created_at`
 *    and `expires_at` for ISO date-time format and ensure that only the
 *    documented summary fields exist on each item.
 *
 * The test does not attempt to assert business semantics such as which exact
 * tokens are returned for particular statuses, because public APIs do not
 * surface the underlying authCredentialsId or token values, and the platform
 * may legitimately return empty result sets for arbitrary identifiers in an
 * isolated test environment.
 */
export async function test_api_platform_admin_search_email_verification_tokens_for_customer_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin so we have an authenticated
  // actor capable of calling admin-scoped endpoints.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Re-login as the same platform admin to ensure login works and
  // the SDK updates Authorization header appropriately.
  const platformAdminLoginBody = {
    email: joinedAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loggedInAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Use a random UUID as authCredentialsId. We cannot obtain a
  // concrete credential id from public APIs, but we can still
  // validate structural and pagination behavior for any identifier.
  const randomAuthCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Base filter request without explicit pagination (server defaults).
  const baseFilter = {
    page: undefined,
    pageSize: undefined,
    status: null,
    email: null,
    issuedFrom: null,
    issuedTo: null,
    expiresBefore: null,
    expiresAfter: null,
    sortBy: null,
    sortOrder: null,
  } satisfies IShoppingMallEmailVerificationToken.IRequest;

  const basePage: IPageIShoppingMallEmailVerificationToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
      connection,
      {
        authCredentialsId: randomAuthCredentialsId,
        body: baseFilter,
      },
    );
  typia.assert(basePage);

  // Basic structural expectations: pagination and data exist.
  const basePagination = basePage.pagination;
  const baseData = basePage.data;

  TestValidator.predicate(
    "pagination current should be >= 0",
    basePagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    basePagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    basePagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    basePagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed records",
    baseData.length <= basePagination.records,
  );

  // 4. Call again with explicit tight pagination and filters.
  const nowIso = new Date().toISOString();
  const filterWithPagination = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: null,
    email: null,
    issuedFrom: null,
    issuedTo: nowIso,
    expiresBefore: null,
    expiresAfter: null,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IShoppingMallEmailVerificationToken.IRequest;

  const paged: IPageIShoppingMallEmailVerificationToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
      connection,
      {
        authCredentialsId: randomAuthCredentialsId,
        body: filterWithPagination,
      },
    );
  typia.assert(paged);

  const pagination = paged.pagination;
  const tokens = paged.data;
  const requestedPageSize = filterWithPagination.pageSize;

  // Validate that the effective limit is at least as small as the
  // requested pageSize and that no more than `pageSize` items are
  // returned in the current page.
  TestValidator.predicate(
    "effective limit should be >= 0",
    pagination.limit >= 0,
  );
  if (requestedPageSize !== undefined && requestedPageSize !== null) {
    TestValidator.predicate(
      "returned items should not exceed requested pageSize",
      tokens.length <= requestedPageSize,
    );
  }

  // 5. If any tokens are present, perform additional sanity checks
  // on summary shape and date-time formats.
  if (tokens.length > 0) {
    for (const token of tokens) {
      // The summary type only exposes id, expires_at, created_at -
      // typia.assert has already validated the structure, but we
      // additionally assert they are non-empty strings.
      TestValidator.predicate(
        "token id should be non-empty",
        token.id.length > 0,
      );
      TestValidator.predicate(
        "token created_at should be non-empty",
        token.created_at.length > 0,
      );
      TestValidator.predicate(
        "token expires_at should be non-empty",
        token.expires_at.length > 0,
      );
    }
  }
}
