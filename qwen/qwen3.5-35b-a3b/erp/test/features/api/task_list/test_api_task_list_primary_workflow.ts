import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_list_primary_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Validation: List all tasks (no filters) - empty or baseline state
  const allTasksResponse = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(allTasksResponse);
  TestValidator.predicate("all tasks response valid", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(allTasksResponse),
  );
  // 3. Validation: Filter by status (TODO)
  const todoTasksResponse = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: { status: "TODO" },
    },
  );
  typia.assert(todoTasksResponse);
  TestValidator.predicate("TODO filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(todoTasksResponse),
  );
  // 4. Validation: Filter by status (IN_PROGRESS)
  const inProgressTasksResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { status: "IN_PROGRESS" },
    });
  typia.assert(inProgressTasksResponse);
  TestValidator.predicate("IN_PROGRESS filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(inProgressTasksResponse),
  );
  // 5. Validation: Filter by status (IN_REVIEW)
  const inReviewTasksResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { status: "IN_REVIEW" },
    });
  typia.assert(inReviewTasksResponse);
  TestValidator.predicate("IN_REVIEW filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(inReviewTasksResponse),
  );
  // 6. Validation: Filter by status (DONE)
  const doneTasksResponse = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: { status: "DONE" },
    },
  );
  typia.assert(doneTasksResponse);
  TestValidator.predicate("DONE filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(doneTasksResponse),
  );
  // 7. Validation: Filter by priority (LOW)
  const lowPriorityResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { priority: "LOW" },
    });
  typia.assert(lowPriorityResponse);
  TestValidator.predicate("LOW priority filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(lowPriorityResponse),
  );
  // 8. Validation: Filter by priority (MEDIUM)
  const mediumPriorityResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { priority: "MEDIUM" },
    });
  typia.assert(mediumPriorityResponse);
  TestValidator.predicate("MEDIUM priority filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(mediumPriorityResponse),
  );
  // 9. Validation: Filter by priority (HIGH)
  const highPriorityResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { priority: "HIGH" },
    });
  typia.assert(highPriorityResponse);
  TestValidator.predicate("HIGH priority filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(highPriorityResponse),
  );
  // 10. Validation: Filter by priority (CRITICAL)
  const criticalPriorityResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { priority: "CRITICAL" },
    });
  typia.assert(criticalPriorityResponse);
  TestValidator.predicate("CRITICAL priority filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(criticalPriorityResponse),
  );
  // 11. Validation: Filter by searchTitle (partial match)
  const searchTitleResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { searchTitle: "Test" },
    });
  typia.assert(searchTitleResponse);
  TestValidator.predicate("searchTitle filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(searchTitleResponse),
  );
  // 12. Validation: Filter by project_id (UUID format)
  const projectIdFilterResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { project_id: typia.random<string & tags.Format<"uuid">>() },
    });
  typia.assert(projectIdFilterResponse);
  TestValidator.predicate("project_id filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(projectIdFilterResponse),
  );
  // 13. Validation: Filter by assigned_employee_id (UUID format)
  const employeeIdFilterResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        assigned_employee_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  typia.assert(employeeIdFilterResponse);
  TestValidator.predicate("assigned_employee_id filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(employeeIdFilterResponse),
  );
  // 14. Validation: Filter by parent_task_id (hierarchical query)
  const parentTaskIdFilterResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { parent_task_id: typia.random<string & tags.Format<"uuid">>() },
    });
  typia.assert(parentTaskIdFilterResponse);
  TestValidator.predicate("parent_task_id filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(parentTaskIdFilterResponse),
  );
  // 15. Validation: Filter by due_date_after (date range)
  const dueDateAfterResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { due_date_after: new Date().toISOString() },
    });
  typia.assert(dueDateAfterResponse);
  TestValidator.predicate("due_date_after filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(dueDateAfterResponse),
  );
  // 16. Validation: Filter by due_date_before (date range)
  const dueDateBeforeResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { due_date_before: new Date().toISOString() },
    });
  typia.assert(dueDateBeforeResponse);
  TestValidator.predicate("due_date_before filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(dueDateBeforeResponse),
  );
  // 17. Validation: Filter by created_after (date range)
  const createdAfterResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { created_after: new Date().toISOString() },
    });
  typia.assert(createdAfterResponse);
  TestValidator.predicate("created_after filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(createdAfterResponse),
  );
  // 18. Validation: Filter by created_before (date range)
  const createdBeforeResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { created_before: new Date().toISOString() },
    });
  typia.assert(createdBeforeResponse);
  TestValidator.predicate("created_before filter valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(createdBeforeResponse),
  );
  // 19. Validation: Combined filters (status AND priority)
  const combinedFilterResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        status: "TODO",
        priority: "HIGH",
      },
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate("combined filters valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(combinedFilterResponse),
  );
  // 20. Validation: Sorting by created_at ASC
  const sortCreatedAtAscResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "ASC",
      },
    });
  typia.assert(sortCreatedAtAscResponse);
  TestValidator.predicate("sort by created_at ASC valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(sortCreatedAtAscResponse),
  );
  // 21. Validation: Sorting by created_at DESC
  const sortCreatedAtDescResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "DESC",
      },
    });
  typia.assert(sortCreatedAtDescResponse);
  TestValidator.predicate("sort by created_at DESC valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(sortCreatedAtDescResponse),
  );
  // 22. Validation: Sorting by due_date ASC
  const sortDueDateAscResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sortBy: "due_date",
        sortOrder: "ASC",
      },
    });
  typia.assert(sortDueDateAscResponse);
  TestValidator.predicate("sort by due_date ASC valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(sortDueDateAscResponse),
  );
  // 23. Validation: Sorting by due_date DESC
  const sortDueDateDescResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sortBy: "due_date",
        sortOrder: "DESC",
      },
    });
  typia.assert(sortDueDateDescResponse);
  TestValidator.predicate("sort by due_date DESC valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(sortDueDateDescResponse),
  );
  // 24. Validation: Sorting by priority ASC
  const sortPriorityAscResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sortBy: "priority",
        sortOrder: "ASC",
      },
    });
  typia.assert(sortPriorityAscResponse);
  TestValidator.predicate("sort by priority ASC valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(sortPriorityAscResponse),
  );
  // 25. Validation: Sorting by priority DESC
  const sortPriorityDescResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sortBy: "priority",
        sortOrder: "DESC",
      },
    });
  typia.assert(sortPriorityDescResponse);
  TestValidator.predicate("sort by priority DESC valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(sortPriorityDescResponse),
  );
  // 26. Validation: Sorting by title ASC
  const sortTitleAscResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sortBy: "title",
        sortOrder: "ASC",
      },
    });
  typia.assert(sortTitleAscResponse);
  TestValidator.predicate("sort by title ASC valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(sortTitleAscResponse),
  );
  // 27. Validation: Sorting by title DESC
  const sortTitleDescResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sortBy: "title",
        sortOrder: "DESC",
      },
    });
  typia.assert(sortTitleDescResponse);
  TestValidator.predicate("sort by title DESC valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(sortTitleDescResponse),
  );
  // 28. Validation: Pagination - page 1 with limit 10
  const paginationPage1Response =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(paginationPage1Response);
  TestValidator.equals(
    "pagination page 1 current",
    paginationPage1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page 1 limit",
    paginationPage1Response.pagination.limit,
    10,
  );
  // 29. Validation: Pagination - page 2
  const paginationPage2Response =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        page: 2,
        limit: 10,
      },
    });
  typia.assert(paginationPage2Response);
  TestValidator.equals(
    "pagination page 2 current",
    paginationPage2Response.pagination.current,
    2,
  );
  // 30. Validation: Pagination - null page (defaults to 1)
  const paginationNullPageResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        page: null,
      },
    });
  typia.assert(paginationNullPageResponse);
  TestValidator.equals(
    "pagination null page defaults to 1",
    paginationNullPageResponse.pagination.current,
    1,
  );
  // 31. Validation: Pagination - metadata accuracy
  TestValidator.predicate("pagination records and pages relationship", () => {
    const records = allTasksResponse.pagination.records;
    const limit = allTasksResponse.pagination.limit;
    const pages = allTasksResponse.pagination.pages;
    const expectedPages = limit === 0 ? 0 : Math.ceil(records / limit);
    return pages === expectedPages;
  });
  // 32. Validation: Cursor-based pagination
  const cursorPaginationResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        cursor: typia.random<string & tags.Format<"uuid">>(),
        limit: 5,
      },
    });
  typia.assert(cursorPaginationResponse);
  TestValidator.predicate("cursor pagination valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(cursorPaginationResponse),
  );
  // 33. Validation: Empty result with non-existent status
  const emptyStatusResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: { status: "NON_EXISTENT_STATUS" },
    });
  typia.assert(emptyStatusResponse);
  TestValidator.equals(
    "empty result data array",
    emptyStatusResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyStatusResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyStatusResponse.pagination.pages,
    0,
  );
  // 34. Validation: Very large limit
  const largeLimitResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        limit: 100,
      },
    });
  typia.assert(largeLimitResponse);
  TestValidator.predicate("large limit valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(largeLimitResponse),
  );
  // 35. Validation: Complex combined filters
  const complexFilterResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        searchTitle: "Test",
        status: "TODO",
        priority: "HIGH",
        due_date_after: new Date().toISOString(),
        sortBy: "created_at",
        sortOrder: "DESC",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(complexFilterResponse);
  TestValidator.predicate("complex filters valid response", () =>
    typia.is<IPageIHrmPlatformTask.ISummary>(complexFilterResponse),
  );
}
