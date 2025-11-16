import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuser";

export async function test_api_admin_memberuser_index_soft_deletion_handling(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed one generic account restriction episode (does not directly
  // affect member listing in this test but satisfies dependency setup)
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const restrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "testing",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now.toISOString(),
    ends_at: inOneHour.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(restriction);

  // Helper to assert basic pagination invariants
  const assertPagination = (
    titlePrefix: string,
    page: IPageICommunityPlatformMemberuser.ISummary,
  ): void => {
    typia.assert<IPageICommunityPlatformMemberuser.ISummary>(page);

    const pagination = page.pagination;
    const data = page.data;

    TestValidator.predicate(
      `${titlePrefix} - pagination.limit >= 0`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - pagination.current >= 0`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - pagination.records >= data.length`,
      pagination.records >= data.length,
    );

    if (pagination.limit > 0) {
      const minPages = Math.ceil(pagination.records / pagination.limit);
      TestValidator.predicate(
        `${titlePrefix} - pagination.pages >= minPages`,
        pagination.pages >= minPages,
      );
    } else {
      TestValidator.equals(
        `${titlePrefix} - when limit is 0, pages must be 0`,
        pagination.pages,
        0,
      );
    }
  };

  // 3. Call memberUsers.index with deleted flag variations
  const baseRequest: ICommunityPlatformMemberuser.IRequest = {
    page: 1,
    pageSize: 20,
    sortField: "created_at",
    sortOrder: "desc",
  };

  // 3-1. deleted omitted (union view)
  const unionPage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: baseRequest,
      },
    );
  assertPagination("union(deleted omitted)", unionPage);

  // 3-2. deleted=false (active accounts)
  const activeRequest: ICommunityPlatformMemberuser.IRequest = {
    ...baseRequest,
    deleted: false,
  };
  const activePage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: activeRequest,
      },
    );
  assertPagination("active(deleted=false)", activePage);

  // 3-3. deleted=true (soft-deleted accounts)
  const deletedRequest: ICommunityPlatformMemberuser.IRequest = {
    ...baseRequest,
    deleted: true,
  };
  const deletedPage: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.index(
      connection,
      {
        body: deletedRequest,
      },
    );
  assertPagination("deleted(deleted=true)", deletedPage);

  // 4. Cross-validate pagination metadata across union and subsets
  const unionRecords = unionPage.pagination.records;
  const activeRecords = activePage.pagination.records;
  const deletedRecords = deletedPage.pagination.records;

  TestValidator.predicate(
    "union records should be >= active records",
    unionRecords >= activeRecords,
  );
  TestValidator.predicate(
    "union records should be >= deleted records",
    unionRecords >= deletedRecords,
  );
  TestValidator.predicate(
    "union records should be >= sum of subsets in simple case",
    unionRecords >= activeRecords + deletedRecords,
  );

  // 5. Validate that subset pages do not return more rows than union page
  TestValidator.predicate(
    "active page size must be <= union page size",
    activePage.data.length <= unionPage.data.length,
  );
  TestValidator.predicate(
    "deleted page size must be <= union page size",
    deletedPage.data.length <= unionPage.data.length,
  );

  // 6. If both active and deleted pages return data, verify that their IDs
  // are subsets of the union's IDs (best-effort check using the
  // current page only).
  const unionIds = new Set(unionPage.data.map((m) => m.id));

  if (activePage.data.length > 0) {
    const allActiveInUnion = activePage.data.every((m) => unionIds.has(m.id));
    TestValidator.predicate(
      "all active-page IDs must be included in union-page IDs",
      allActiveInUnion,
    );
  }

  if (deletedPage.data.length > 0) {
    const allDeletedInUnion = deletedPage.data.every((m) => unionIds.has(m.id));
    TestValidator.predicate(
      "all deleted-page IDs must be included in union-page IDs",
      allDeletedInUnion,
    );
  }
}
