import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_index_with_status_filter(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a primary platform administrator who will
  // act as the caller for protected platformAdmin operations.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional; omit it to let backend infer or leave null
    href: "https://admin.console.local/signup",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const primaryAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(primaryAdmin);

  // 2. Create a custom account status that can be used as a filter.
  const statusCreateBody = {
    key: `SUSPENDED_${RandomGenerator.alphabets(6)}`,
    label: "Suspended (test)",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(createdStatus);

  // 3. Register at least one additional platform admin account so that we
  // have multiple admins in the system. The backend will assign them some
  // account status; we assume at least one matches the new status or that
  // search with the new status will still behave correctly even if 0
  // records match (pagination still consistent).
  const secondaryJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}+secondary@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/signup-secondary",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const secondaryAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: secondaryJoinBody,
    });
  typia.assert(secondaryAdmin);

  // 4. Search platform admins using the new status ID as a filter with a
  // small page/limit and sorting.
  const page = 1 satisfies number;
  const limit = 2 satisfies number;

  const requestBody = {
    page,
    limit,
    statusIds: [createdStatus.id],
    sortBy: "createdAt",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPlatformadmin.IRequest;

  const firstPage: IPageICommunityPlatformPlatformadmin.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.index(
      connection,
      { body: requestBody },
    );
  typia.assert(firstPage);

  // 5. Validate pagination metadata is consistent.
  const pagination: IPage.IPagination = firstPage.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination current page should equal requested page",
    pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit should be at least the requested limit",
    pagination.limit >= limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records >= data length",
    pagination.records >= firstPage.data.length,
  );

  // 6. Assert that all returned admins, if any, have the expected
  // accountStatus.id and that none has a different status.
  for (const summary of firstPage.data) {
    typia.assert<ICommunityPlatformPlatformadmin.ISummary>(summary);
    TestValidator.equals(
      "every admin summary's accountStatus.id should be one of the requested statusIds",
      summary.accountStatus.id,
      createdStatus.id,
    );
  }

  // 7. Optionally, when there is more than one page, fetch the second page
  // and verify that pagination works and that records across pages are
  // consistent with pagination metadata.
  if (pagination.pages > 1) {
    const secondRequestBody = {
      ...requestBody,
      page: 2,
    } satisfies ICommunityPlatformPlatformadmin.IRequest;

    const secondPage: IPageICommunityPlatformPlatformadmin.ISummary =
      await api.functional.communityPlatform.platformAdmin.platformAdmins.index(
        connection,
        { body: secondRequestBody },
      );
    typia.assert(secondPage);

    const totalCount = firstPage.data.length + secondPage.data.length;

    TestValidator.predicate(
      "second page current should be 2",
      secondPage.pagination.current === 2,
    );
    TestValidator.predicate(
      "total records reported should be >= combined length of first two pages",
      secondPage.pagination.records >= totalCount,
    );

    for (const summary of secondPage.data) {
      typia.assert<ICommunityPlatformPlatformadmin.ISummary>(summary);
      TestValidator.equals(
        "second-page admin summaries must still match the requested statusIds",
        summary.accountStatus.id,
        createdStatus.id,
      );
    }
  }
}
