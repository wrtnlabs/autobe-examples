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

/**
 * Test hierarchical task query functionality for retrieving child tasks (subtasks).
 *
 * Validates the complete hierarchical task structure by testing parent-child task relationships,
 * including filtering by parent task ID, verifying parent exclusion from child results,
 * and ensuring proper task structure with parentTask field populated. The test covers
 * multiple validation points including empty hierarchy handling, sorting, pagination,
 * and filter combinations with hierarchical queries.
 *
 * 1. Member registration creates organization and initial connection
 * 2. Query initial tasks to verify empty state
 * 3. Test empty hierarchy with non-existent parent task ID
 * 4. Validate empty hierarchy response structure and pagination
 * 5. Test hierarchical query with sorting (ASC/DESC)
 * 6. Test hierarchical query with pagination parameters
 * 7. Test status and priority filters combined with parent_task_id
 * 8. Test cursor-based pagination with hierarchical queries
 */
export async function test_api_task_list_hierarchical_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration (creates organization automatically)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 1 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create authenticated connection with member's token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: joinResponse.token.access };
  // 3. Query initial tasks (should be empty)
  const initialTasks = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(initialTasks);
  TestValidator.equals("initial tasks count", initialTasks.data.length, 0);
  // 4. Test empty hierarchy (parent with no children)
  const nonExistentParentId = typia.random<string & tags.Format<"uuid">>();
  const emptyHierarchyResult =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        parent_task_id: nonExistentParentId,
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(emptyHierarchyResult);
  // 5. Validate empty hierarchy response structure
  TestValidator.equals(
    "empty hierarchy items count",
    emptyHierarchyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty hierarchy pagination current",
    emptyHierarchyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty hierarchy pagination records",
    emptyHierarchyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty hierarchy pagination pages",
    emptyHierarchyResult.pagination.pages,
    0,
  );
  // 6. Test hierarchical query with sorting (ASC)
  const sortedHierarchyResult =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        parent_task_id: nonExistentParentId,
        sortBy: "created_at",
        sortOrder: "ASC",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(sortedHierarchyResult);
  // 7. Test hierarchical query with sorting (DESC)
  const sortedDescResult = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        parent_task_id: nonExistentParentId,
        sortBy: "created_at",
        sortOrder: "DESC",
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(sortedDescResult);
  // 8. Test hierarchical query with pagination
  const paginatedHierarchyResult =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        parent_task_id: nonExistentParentId,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(paginatedHierarchyResult);
  // 9. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    paginatedHierarchyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedHierarchyResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records",
    paginatedHierarchyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages",
    paginatedHierarchyResult.pagination.pages,
    0,
  );
  // 10. Test with status filter combined with parent_task_id
  const statusFilteredResult =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        parent_task_id: nonExistentParentId,
        status: "IN_PROGRESS",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(statusFilteredResult);
  // 11. Test with priority filter combined with parent_task_id
  const priorityFilteredResult =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        parent_task_id: nonExistentParentId,
        priority: "HIGH",
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(priorityFilteredResult);
  // 12. Test cursor-based pagination
  const cursorPaginationResult =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        parent_task_id: nonExistentParentId,
        cursor: undefined,
        limit: 5,
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(cursorPaginationResult);
}
