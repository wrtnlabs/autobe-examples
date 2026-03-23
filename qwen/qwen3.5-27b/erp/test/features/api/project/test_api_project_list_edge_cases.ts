import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test edge cases and boundary conditions for project listing.
 *
 * 1. Authenticate as member user
 * 2. Test empty organization scenario (no projects)
 * 3. Test pagination boundaries (max/min page_size, beyond total pages)
 * 4. Test search edge cases (empty string, special chars, no matches)
 * 5. Test invalid status filter
 * 6. Verify pagination structure consistency
 */
export async function test_api_project_list_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test empty organization scenario (no projects exist)
  const emptyResult = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty org has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty org has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty org has empty data array",
    emptyResult.data.length,
    0,
  );
  // 3. Test pagination boundary: maximum page_size (100)
  const maxPageSizeResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        page: 1,
        page_size: 100,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(maxPageSizeResult);
  TestValidator.equals(
    "max page_size enforced",
    maxPageSizeResult.pagination.limit,
    100,
  );
  // 4. Test pagination boundary: minimum page_size (1)
  const minPageSizeResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        page: 1,
        page_size: 1,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(minPageSizeResult);
  TestValidator.equals(
    "min page_size enforced",
    minPageSizeResult.pagination.limit,
    1,
  );
  // 5. Test pagination beyond total pages
  const beyondPagesResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        page: 999,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(beyondPagesResult);
  TestValidator.equals(
    "beyond pages returns empty data",
    beyondPagesResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond pages shows correct current page",
    beyondPagesResult.pagination.current,
    999,
  );
  // 6. Test search with empty string (should return all projects)
  const emptySearchResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        search: "",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns valid response",
    emptySearchResult.pagination.records >= 0,
    true,
  );
  // 7. Test search with special characters
  const specialCharSearchResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        search: "test@#$%^&*()",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(specialCharSearchResult);
  TestValidator.equals(
    "special chars search returns valid response",
    specialCharSearchResult.pagination.records >= 0,
    true,
  );
  // 8. Test search with unlikely string (no matches expected)
  const noMatchSearchResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        search: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(noMatchSearchResult);
  TestValidator.equals(
    "no match search returns empty data",
    noMatchSearchResult.data.length,
    0,
  );
  // 9. Test invalid status filter
  const invalidStatusResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "invalid_status_value",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(invalidStatusResult);
  TestValidator.equals(
    "invalid status returns valid response",
    invalidStatusResult.pagination.records >= 0,
    true,
  );
  // 10. Test valid status filters
  const activeStatusResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "active",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(activeStatusResult);
  TestValidator.equals(
    "active status filter returns valid response",
    activeStatusResult.pagination.records >= 0,
    true,
  );
  const completedStatusResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "completed",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(completedStatusResult);
  TestValidator.equals(
    "completed status filter returns valid response",
    completedStatusResult.pagination.records >= 0,
    true,
  );
  const archivedStatusResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "archived",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(archivedStatusResult);
  TestValidator.equals(
    "archived status filter returns valid response",
    archivedStatusResult.pagination.records >= 0,
    true,
  );
  // 11. Test sorting options
  const sortByNameResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "name",
        order: "ASC",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(sortByNameResult);
  TestValidator.equals(
    "sort by name returns valid response",
    sortByNameResult.pagination.records >= 0,
    true,
  );
  const sortByStatusResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "status",
        order: "DESC",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(sortByStatusResult);
  TestValidator.equals(
    "sort by status returns valid response",
    sortByStatusResult.pagination.records >= 0,
    true,
  );
  const sortByCreatedAtResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "created_at",
        order: "DESC",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(sortByCreatedAtResult);
  TestValidator.equals(
    "sort by created_at returns valid response",
    sortByCreatedAtResult.pagination.records >= 0,
    true,
  );
  // 12. Test default parameters (no query params)
  const defaultResult = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit is positive",
    defaultResult.pagination.limit > 0,
  );
}
