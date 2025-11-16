import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSecurityEvent";

export async function test_api_user_security_events_search_by_account_status_and_severity(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join) to obtain an authorized connection
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphabets(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorizedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a new account status definition
  const statusKey = `TEST_STATUS_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const createStatusBody = {
    key: statusKey,
    label: `Test Status ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: createStatusBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Query user security events filtered by account_status_id and severity_level
  const requestedSeverity = "high";
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestPageSize = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const filterBody = {
    account_status_id: createdStatus.id,
    severity_level: requestedSeverity,
    page: requestPage,
    pageSize: requestPageSize,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const pageByStatusAndSeverity: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
      connection,
      { body: filterBody },
    );
  typia.assert(pageByStatusAndSeverity);

  const paginationByStatusAndSeverity: IPage.IPagination =
    pageByStatusAndSeverity.pagination;

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination current page equals requested page",
    paginationByStatusAndSeverity.current === requestPage,
  );
  TestValidator.predicate(
    "pagination limit equals requested pageSize",
    paginationByStatusAndSeverity.limit === requestPageSize,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginationByStatusAndSeverity.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginationByStatusAndSeverity.pages >= 0,
  );

  // If any records are returned, ensure all severities match the requested filter
  const dataByStatusAndSeverity = pageByStatusAndSeverity.data;
  if (dataByStatusAndSeverity.length > 0) {
    await ArrayUtil.asyncForEach(dataByStatusAndSeverity, async (event) => {
      const summary: ICommunityPlatformUserSecurityEvent.ISummary = event;
      typia.assert(summary);
      TestValidator.equals(
        "event severity_level matches requested filter",
        summary.severity_level,
        requestedSeverity,
      );
    });
  }

  // 4. Query with a severity_level that should reliably yield no results
  const impossibleSeverity = `severity_never_exists_${RandomGenerator.alphaNumeric(16)}`;
  const emptyFilterBody = {
    severity_level: impossibleSeverity,
    page: requestPage,
    pageSize: requestPageSize,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const emptyPage: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
      connection,
      { body: emptyFilterBody },
    );
  typia.assert(emptyPage);

  const emptyPagination: IPage.IPagination = emptyPage.pagination;
  const emptyData = emptyPage.data;

  // Empty result expectations
  TestValidator.predicate(
    "empty severity filter returns zero records",
    emptyPagination.records === 0,
  );
  TestValidator.predicate(
    "empty severity filter has zero or one page",
    emptyPagination.pages === 0 || emptyPagination.pages === 1,
  );
  TestValidator.equals(
    "empty severity filter returns empty data array",
    emptyData.length,
    0,
  );
}
