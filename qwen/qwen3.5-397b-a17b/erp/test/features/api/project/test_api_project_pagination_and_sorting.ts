import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test pagination and sorting edge cases for project listing.
 *
 * This test validates:
 * 1. Member authentication via join
 * 2. Creating 25 projects to exceed default page size (20)
 * 3. Default pagination (page=1, limit=20) returns correct count
 * 4. Custom page sizes at boundaries (limit=1, limit=50, limit=100)
 * 5. Pagination metadata accuracy (current, limit, records, pages)
 * 6. Navigation to subsequent pages (page=2, page=3)
 * 7. Sorting by different fields (created_at, name, status) in asc/desc order
 * 8. Consistent ordering across multiple requests
 * 9. Edge case: total records equals page limit
 * 10. Edge case: empty project list returns zero counts
 */
export async function test_api_project_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create 25 projects to exceed default page size
  const projectCount = 25;
  const statuses = ["active", "archived", "completed"] as const;
  const createdProjects: IHrmPlatformProject[] = await ArrayUtil.asyncRepeat(
    projectCount,
    async (index) => {
      return await generate_random_hrm_platform_member_projects_create(
        memberConnection,
        {
          body: {
            name: `Project ${String(index + 1).padStart(3, "0")}`,
            color_code: "#000000",
            status: RandomGenerator.pick(statuses),
          } satisfies IHrmPlatformProject.ICreate,
        },
      );
    },
  );
  TestValidator.equals("project count", createdProjects.length, projectCount);
  // 3. Test default pagination (page=1, limit=20)
  const defaultPage = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page returns 20 items",
    defaultPage.data.length,
    20,
  );
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 20);
  TestValidator.equals(
    "default page records",
    defaultPage.pagination.records,
    projectCount,
  );
  TestValidator.equals(
    "default page total pages",
    defaultPage.pagination.pages,
    2,
  );
  // 4. Test custom page sizes at boundaries
  // limit=1
  const limitOne = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(limitOne);
  TestValidator.equals("limit=1 returns 1 item", limitOne.data.length, 1);
  TestValidator.equals(
    "limit=1 pages",
    limitOne.pagination.pages,
    projectCount,
  );
  // limit=50
  const limitFifty = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(limitFifty);
  TestValidator.equals(
    "limit=50 returns all items",
    limitFifty.data.length,
    projectCount,
  );
  TestValidator.equals("limit=50 pages", limitFifty.pagination.pages, 1);
  // limit=100
  const limitHundred = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(limitHundred);
  TestValidator.equals(
    "limit=100 returns all items",
    limitHundred.data.length,
    projectCount,
  );
  // 5. Test navigation to subsequent pages
  const page2 = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 returns 5 items", page2.data.length, 5);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 6. Test sorting by created_at descending
  const sortedCreatedDesc =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "created_at",
        order: "desc",
        limit: 100,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(sortedCreatedDesc);
  TestValidator.equals(
    "sorted desc count",
    sortedCreatedDesc.data.length,
    projectCount,
  );
  // Verify descending order (newest first)
  for (let i = 1; i < sortedCreatedDesc.data.length; i++) {
    TestValidator.predicate(
      `created_at desc order at index ${i}`,
      new Date(sortedCreatedDesc.data[i - 1].created_at).getTime() >=
        new Date(sortedCreatedDesc.data[i].created_at).getTime(),
    );
  }
  // 7. Test sorting by created_at ascending
  const sortedCreatedAsc =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "created_at",
        order: "asc",
        limit: 100,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(sortedCreatedAsc);
  // Verify ascending order (oldest first)
  for (let i = 1; i < sortedCreatedAsc.data.length; i++) {
    TestValidator.predicate(
      `created_at asc order at index ${i}`,
      new Date(sortedCreatedAsc.data[i - 1].created_at).getTime() <=
        new Date(sortedCreatedAsc.data[i].created_at).getTime(),
    );
  }
  // 8. Test sorting by name ascending
  const sortedNameAsc = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        sort: "name",
        order: "asc",
        limit: 100,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(sortedNameAsc);
  // Verify name ascending order
  for (let i = 1; i < sortedNameAsc.data.length; i++) {
    TestValidator.predicate(
      `name asc order at index ${i}`,
      sortedNameAsc.data[i - 1].name <= sortedNameAsc.data[i].name,
    );
  }
  // 9. Test sorting by status
  const sortedStatus = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        sort: "status",
        order: "asc",
        limit: 100,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(sortedStatus);
  // Verify status ascending order
  for (let i = 1; i < sortedStatus.data.length; i++) {
    TestValidator.predicate(
      `status asc order at index ${i}`,
      sortedStatus.data[i - 1].status <= sortedStatus.data[i].status,
    );
  }
  // 10. Test consistent ordering across multiple requests
  const consistentCheck1 =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "created_at",
        order: "desc",
        limit: 100,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(consistentCheck1);
  const consistentCheck2 =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        sort: "created_at",
        order: "desc",
        limit: 100,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(consistentCheck2);
  TestValidator.equals(
    "consistent ordering",
    consistentCheck1.data.map((p) => p.id),
    consistentCheck2.data.map((p) => p.id),
  );
  // 11. Test edge case: filter to get subset by status
  const firstProjectStatus = typia.assert<"active" | "archived" | "completed">(createdProjects[0].status);
  const filteredPage = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        status: firstProjectStatus,
        limit: 100,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered results have matching status",
    filteredPage.data.every((p) => p.status === firstProjectStatus),
  );
  // 12. Test edge case: empty result set with search filter
  const emptySearch = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        search: "NONEXISTENT_PROJECT_NAME_XYZ123",
        limit: 20,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns 0 items",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search current",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.equals("empty search limit", emptySearch.pagination.limit, 20);
  TestValidator.equals(
    "empty search records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals("empty search pages", emptySearch.pagination.pages, 0);
}