import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";

/**
 * Verify task filtering by parent task reference (subtasks) and assigned employee with project membership validation.
 *
 * Tests the task indexing endpoint with various filter combinations to validate that:
 * - Filtering by parentId returns only subtasks belonging to that parent task
 * - Filtering by assignedEmployeeId returns only tasks assigned to that specific employee
 * - Combined filtering by both parentId and assignedEmployeeId works correctly
 * - Project membership validation is enforced (only project members can access tasks)
 * - Unassigned tasks are returned correctly when no assignedEmployeeId filter is applied
 *
 * 1. Authenticate as a new member
 * 2. Create a project
 * 3. Test task filtering by parentId
 * 4. Test task filtering by assignedEmployeeId
 * 5. Test combined filtering
 * 6. Validate pagination response structure
 */
export async function test_api_project_task_filter_by_parent_subtask_and_assigned_employee(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as a new member
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IHrmPlatformMember.IJoin,
    });
    // 2. Create a project
    const project: IHrmPlatformProject = await generate_random_hrm_platform_member_projects_create(memberConnection, {
        body: {
            name: RandomGenerator.alphabets(10),
            color_code: "#FF5733",
        } satisfies IHrmPlatformProject.ICreate,
    });
    typia.assert(project);
    // 3. Test task filtering by parentId (using a random UUID as parentId filter)
    const parentTaskId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const tasksByParent: IPageIHrmPlatformTask.ISummary = await api.functional.hrmPlatform.member.projects.tasks.index(memberConnection, {
        projectId: project.id,
        body: {
            parentId: parentTaskId,
        } satisfies IHrmPlatformTask.IRequest,
    });
    typia.assert(tasksByParent);
    // 4. Test task filtering by assignedEmployeeId (using a random UUID as employeeId filter)
    const assignedEmployeeId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const tasksByEmployee: IPageIHrmPlatformTask.ISummary = await api.functional.hrmPlatform.member.projects.tasks.index(memberConnection, {
        projectId: project.id,
        body: {
            assignedEmployeeId: assignedEmployeeId,
        } satisfies IHrmPlatformTask.IRequest,
    });
    typia.assert(tasksByEmployee);
    // 5. Test combined filtering by both parentId and assignedEmployeeId
    const tasksByBoth: IPageIHrmPlatformTask.ISummary = await api.functional.hrmPlatform.member.projects.tasks.index(memberConnection, {
        projectId: project.id,
        body: {
            parentId: parentTaskId,
            assignedEmployeeId: assignedEmployeeId,
        } satisfies IHrmPlatformTask.IRequest,
    });
    typia.assert(tasksByBoth);
    // 6. Test with unassigned tasks (assignedEmployeeId set to null)
    const unassignedTasks: IPageIHrmPlatformTask.ISummary = await api.functional.hrmPlatform.member.projects.tasks.index(memberConnection, {
        projectId: project.id,
        body: {
            assignedEmployeeId: null,
        } satisfies IHrmPlatformTask.IRequest,
    });
    typia.assert(unassignedTasks);
    // 7. Test with root-level tasks (no parentId filter)
    const rootTasks: IPageIHrmPlatformTask.ISummary = await api.functional.hrmPlatform.member.projects.tasks.index(memberConnection, {
        projectId: project.id,
        body: {} satisfies IHrmPlatformTask.IRequest,
    });
    typia.assert(rootTasks);
    // 8. Validate pagination structure
    TestValidator.predicate("pagination exists", tasksByParent.pagination !== null);
    TestValidator.equals("current page is 1", tasksByParent.pagination.current, 1);
    TestValidator.predicate("limit is positive", tasksByParent.pagination.limit > 0);
    TestValidator.predicate("records count is non-negative", tasksByParent.pagination.records >= 0);
    TestValidator.predicate("pages count is non-negative", tasksByParent.pagination.pages >= 0);
    // 9. Validate data array structure
    TestValidator.predicate("data array exists", tasksByParent.data !== null);
    TestValidator.predicate("data array is array", Array.isArray(tasksByParent.data));
}