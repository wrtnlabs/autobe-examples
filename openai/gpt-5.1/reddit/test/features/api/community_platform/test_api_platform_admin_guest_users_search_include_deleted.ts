import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuser";

export async function test_api_platform_admin_guest_users_search_include_deleted(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (dependency: POST /auth/platformAdmin/join)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create an account status for potential filtering (dependency)
  const statusBody = {
    key: `GUEST_FLAG_${RandomGenerator.alphabets(6).toUpperCase()}`,
    label: "Guest Flagged",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Call guestUsers.index with include_deleted = true
  const page = 1 satisfies number;
  const pageSize = 50 satisfies number;

  const includeDeletedRequest = {
    page,
    pageSize,
    include_deleted: true,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies ICommunityPlatformGuestuser.IRequest;

  const includeDeletedPage: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.platformAdmin.guestUsers.index(
      connection,
      {
        body: includeDeletedRequest,
      },
    );
  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(includeDeletedPage);

  // 4. Basic pagination assertions
  const includeDeletedPagination: IPage.IPagination =
    includeDeletedPage.pagination;
  typia.assert<IPage.IPagination>(includeDeletedPagination);

  TestValidator.predicate(
    "include_deleted=true: page index should be non-negative",
    includeDeletedPagination.current >= 0,
  );

  TestValidator.predicate(
    "include_deleted=true: limit should be positive or zero",
    includeDeletedPagination.limit >= 0,
  );

  TestValidator.predicate(
    "include_deleted=true: total records should be non-negative",
    includeDeletedPagination.records >= 0,
  );

  TestValidator.predicate(
    "include_deleted=true: total pages should be non-negative",
    includeDeletedPagination.pages >= 0,
  );

  // 5. Validate data array element types when any exist
  if (includeDeletedPage.data.length > 0) {
    includeDeletedPage.data.forEach((guest) => {
      typia.assert<ICommunityPlatformGuestuser.ISummary>(guest);
    });
  }

  // 6. Optional comparative call: include_deleted omitted/false
  const excludeDeletedRequest = {
    page,
    pageSize,
    include_deleted: false,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies ICommunityPlatformGuestuser.IRequest;

  const excludeDeletedPage: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.platformAdmin.guestUsers.index(
      connection,
      {
        body: excludeDeletedRequest,
      },
    );
  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(excludeDeletedPage);

  const excludeDeletedPagination: IPage.IPagination =
    excludeDeletedPage.pagination;
  typia.assert<IPage.IPagination>(excludeDeletedPagination);

  TestValidator.predicate(
    "include_deleted=false: page index should be non-negative",
    excludeDeletedPagination.current >= 0,
  );

  TestValidator.predicate(
    "include_deleted=false: limit should be positive or zero",
    excludeDeletedPagination.limit >= 0,
  );

  TestValidator.predicate(
    "include_deleted=false: total records should be non-negative",
    excludeDeletedPagination.records >= 0,
  );

  TestValidator.predicate(
    "include_deleted=false: total pages should be non-negative",
    excludeDeletedPagination.pages >= 0,
  );

  if (excludeDeletedPage.data.length > 0) {
    excludeDeletedPage.data.forEach((guest) => {
      typia.assert<ICommunityPlatformGuestuser.ISummary>(guest);
    });
  }

  // 7. Coarse-grained comparison between the two result sets
  TestValidator.equals(
    "page index should be identical between include_deleted variants",
    includeDeletedPagination.current,
    excludeDeletedPagination.current,
  );

  TestValidator.equals(
    "requested pageSize should be reflected equally in both variants (limit)",
    includeDeletedPagination.limit,
    excludeDeletedPagination.limit,
  );

  // We cannot assert strict subset/superset relationships or presence of
  // deleted_at because ISummary does not expose deleted_at. Instead, we
  // verify that both endpoints are callable with and without the flag and
  // return structurally correct paginated data.
}
