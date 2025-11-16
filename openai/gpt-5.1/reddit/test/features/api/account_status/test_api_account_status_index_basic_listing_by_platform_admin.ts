import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountStatus";

/**
 * Basic listing of account status definitions by a platform administrator.
 *
 * Business purpose:
 *
 * - Ensure that a platform admin, after registration, can create multiple account
 *   status definitions and then retrieve them through the accountStatuses.index
 *   endpoint using only basic pagination fields.
 * - Validate that pagination metadata reflects the number of created records and
 *   requested limit, and that returned summaries match the created
 *   configurations (key, label, and behavioral flags).
 *
 * Steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join to
 *    obtain an authenticated admin session.
 * 2. Create at least two distinct account status definitions via POST
 *    /communityPlatform/platformAdmin/accountStatuses with different boolean
 *    flag combinations.
 * 3. Call PATCH /communityPlatform/platformAdmin/accountStatuses with an
 *    ICommunityPlatformAccountStatus.IRequest body that only sets page and
 *    limit to retrieve the first page without filters.
 * 4. Validate that pagination metadata (current, limit, records, pages) is
 *    internally consistent and that records/pages are sufficient to contain the
 *    created statuses.
 * 5. Validate that the summaries for the created statuses are present in the data
 *    array and that their key/label and behavioral flags match those used
 *    during creation.
 */
export async function test_api_account_status_index_basic_listing_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to get an authenticated session
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least two distinct account status definitions
  const createStatusBody1 = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active Users",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createStatusBody2 = {
    key: `SUSPENDED_${RandomGenerator.alphaNumeric(6)}`,
    label: "Suspended Users",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus1: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: createStatusBody1,
      },
    );
  typia.assert(createdStatus1);

  const createdStatus2: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: createStatusBody2,
      },
    );
  typia.assert(createdStatus2);

  // 3. Call index with minimal pagination (page and limit only)
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const indexBody = {
    page: requestPage,
    limit: requestLimit,
  } satisfies ICommunityPlatformAccountStatus.IRequest;

  const pageResult: IPageICommunityPlatformAccountStatus.ISummary =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.index(
      connection,
      {
        body: indexBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 4. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current page should be non-negative",
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

  // The effective limit should reflect the requested limit when positive.
  TestValidator.equals(
    "effective limit should respect requested limit",
    pagination.limit,
    requestLimit,
  );

  // We have created at least two statuses; total records should not be less.
  TestValidator.predicate(
    "total records should be at least the number of created statuses",
    pagination.records >= 2,
  );

  // When there are records and a positive limit, pages must be at least 1
  if (pagination.records > 0 && pagination.limit > 0) {
    TestValidator.predicate(
      "when records exist, pages must be at least 1",
      pagination.pages >= 1,
    );
  }

  // 5. Validate that created statuses appear in the data array
  const summaries = pageResult.data;

  const summary1 = summaries.find((s) => s.id === createdStatus1.id);
  const summary2 = summaries.find((s) => s.id === createdStatus2.id);

  TestValidator.predicate(
    "created status 1 should exist in index data",
    summary1 !== undefined,
  );
  TestValidator.predicate(
    "created status 2 should exist in index data",
    summary2 !== undefined,
  );

  if (summary1 !== undefined) {
    typia.assert(summary1);
    TestValidator.equals(
      "status1 key matches",
      summary1.key,
      createdStatus1.key,
    );
    TestValidator.equals(
      "status1 label matches",
      summary1.label,
      createdStatus1.label,
    );
    TestValidator.equals(
      "status1 isLoginAllowed matches",
      summary1.isLoginAllowed,
      createdStatus1.isLoginAllowed,
    );
    TestValidator.equals(
      "status1 isPostingAllowed matches",
      summary1.isPostingAllowed,
      createdStatus1.isPostingAllowed,
    );
    TestValidator.equals(
      "status1 isVotingAllowed matches",
      summary1.isVotingAllowed,
      createdStatus1.isVotingAllowed,
    );
    TestValidator.equals(
      "status1 requiresManualReview matches",
      summary1.requiresManualReview,
      createdStatus1.requiresManualReview,
    );
  }

  if (summary2 !== undefined) {
    typia.assert(summary2);
    TestValidator.equals(
      "status2 key matches",
      summary2.key,
      createdStatus2.key,
    );
    TestValidator.equals(
      "status2 label matches",
      summary2.label,
      createdStatus2.label,
    );
    TestValidator.equals(
      "status2 isLoginAllowed matches",
      summary2.isLoginAllowed,
      createdStatus2.isLoginAllowed,
    );
    TestValidator.equals(
      "status2 isPostingAllowed matches",
      summary2.isPostingAllowed,
      createdStatus2.isPostingAllowed,
    );
    TestValidator.equals(
      "status2 isVotingAllowed matches",
      summary2.isVotingAllowed,
      createdStatus2.isVotingAllowed,
    );
    TestValidator.equals(
      "status2 requiresManualReview matches",
      summary2.requiresManualReview,
      createdStatus2.requiresManualReview,
    );
  }
}
