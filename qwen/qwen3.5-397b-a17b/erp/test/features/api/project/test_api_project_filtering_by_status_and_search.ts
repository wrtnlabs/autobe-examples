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

export async function test_api_project_filtering_by_status_and_search(
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
  // 2. Create projects with distinct statuses
  const activeProject1 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Active Development Project Alpha",
          description: "This is an active project for development testing",
          color_code: "#3498db",
          status: "active",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(activeProject1);
  const activeProject2 =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Active Marketing Campaign Beta",
          description: "Marketing campaign project with active status",
          color_code: "#2ecc71",
          status: "active",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(activeProject2);
  const archivedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Archived Legacy System Gamma",
          description:
            "This project has been archived for historical reference",
          color_code: "#95a5a6",
          status: "archived",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(archivedProject);
  const completedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Completed Migration Project Delta",
          description: "Successfully completed migration initiative",
          color_code: "#e74c3c",
          status: "completed",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(completedProject);
  // 3. Test status filtering - active only
  const activeOnlyResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "active",
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(activeOnlyResult);
  TestValidator.predicate("active filter returns only active projects", () =>
    activeOnlyResult.data.every((p) => p.status === "active"),
  );
  TestValidator.predicate(
    "active filter returns at least 2 projects",
    () => activeOnlyResult.data.length >= 2,
  );
  TestValidator.equals(
    "active pagination records",
    activeOnlyResult.pagination.records,
    activeOnlyResult.data.length,
  );
  // 4. Test status filtering - archived only
  const archivedOnlyResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "archived",
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(archivedOnlyResult);
  TestValidator.predicate(
    "archived filter returns only archived projects",
    () => archivedOnlyResult.data.every((p) => p.status === "archived"),
  );
  TestValidator.predicate(
    "archived filter returns at least 1 project",
    () => archivedOnlyResult.data.length >= 1,
  );
  // 5. Test status filtering - completed only
  const completedOnlyResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "completed",
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(completedOnlyResult);
  TestValidator.predicate(
    "completed filter returns only completed projects",
    () => completedOnlyResult.data.every((p) => p.status === "completed"),
  );
  TestValidator.predicate(
    "completed filter returns at least 1 project",
    () => completedOnlyResult.data.length >= 1,
  );
  // 6. Test text search functionality - search by name partial match
  const searchByNameResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        search: "active",
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(searchByNameResult);
  TestValidator.predicate(
    "search by name returns matching projects",
    () => searchByNameResult.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain search term in name",
    () =>
      searchByNameResult.data.some(
        (p) =>
          p.name.toLowerCase().includes("active"),
      ),
  );
  // 7. Test case-insensitive search
  const searchCaseInsensitiveResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        search: "ACTIVE",
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(searchCaseInsensitiveResult);
  TestValidator.equals(
    "case-insensitive search returns same count",
    searchByNameResult.pagination.records,
    searchCaseInsensitiveResult.pagination.records,
  );
  // 8. Test search by description - search by name containing migration
  const searchByDescriptionResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        search: "migration",
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(searchByDescriptionResult);
  TestValidator.predicate(
    "search by migration returns matching project",
    () =>
      searchByDescriptionResult.data.some(
        (p) =>
          p.name.toLowerCase().includes("migration"),
      ),
  );
  // 9. Test combined filtering - status + search
  const combinedFilterResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        status: "active",
        search: "development",
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns active projects with search term",
    () =>
      combinedFilterResult.data.every(
        (p) =>
          p.status === "active" &&
          (p.name.toLowerCase().includes("development")),
      ),
  );
  // 10. Test date range filtering - created_at_from
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateFromResult = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        created_at_from: oneHourAgo.toISOString(),
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(dateFromResult);
  TestValidator.predicate(
    "date from filter returns projects created after timestamp",
    () =>
      dateFromResult.data.every(
        (p) => new Date(p.created_at).getTime() >= oneHourAgo.getTime(),
      ),
  );
  // 11. Test date range filtering - created_at_to
  const futureDate = new Date(now.getTime() + 60 * 60 * 1000);
  const dateToResult = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        created_at_to: futureDate.toISOString(),
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(dateToResult);
  TestValidator.predicate(
    "date to filter returns projects created before timestamp",
    () =>
      dateToResult.data.every(
        (p) => new Date(p.created_at).getTime() <= futureDate.getTime(),
      ),
  );
  // 12. Test date range filtering - both from and to
  const dateRangeResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        created_at_from: oneHourAgo.toISOString(),
        created_at_to: futureDate.toISOString(),
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns projects within range",
    () =>
      dateRangeResult.data.every((p) => {
        const createdAt = new Date(p.created_at).getTime();
        return (
          createdAt >= oneHourAgo.getTime() && createdAt <= futureDate.getTime()
        );
      }),
  );
  // 13. Test empty result set with non-matching search
  const emptySearchResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        search: "nonexistent_project_xyz_123",
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pages is zero",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search current page is 1",
    emptySearchResult.pagination.current,
    1,
  );
  // 14. Test empty result set with non-matching status filter
  // Create a unique status scenario by filtering for a status that has no projects
  // Since we have all three statuses, test with a date range that excludes all projects
  const oldDate = new Date("2020-01-01T00:00:00Z");
  const emptyDateResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {
        created_at_to: oldDate.toISOString(),
        limit: 10,
      } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(emptyDateResult);
  TestValidator.equals(
    "old date filter returns zero records",
    emptyDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "old date filter returns empty data array",
    emptyDateResult.data.length,
    0,
  );
  TestValidator.equals(
    "old date filter pages is zero",
    emptyDateResult.pagination.pages,
    0,
  );
}