import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminActionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminActionSummary";
import type { ITodoAppAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminDashboard";
import type { ITodoAppAdminTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTotals";
import type { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import type { ITodoAppInvitationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitationSummary";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppListSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListSummary";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskStats";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import type { ITodoAppUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSummary";

export async function test_api_admin_dashboard_overview_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a todo user (becomes the current authenticated actor)
  const todoUserEmail = typia.random<string & tags.Format<"email">>();
  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: todoUserEmail,
        password: "UserPass123!",
        displayName: RandomGenerator.name(),
        href: "https://example.test/signup",
        referrer: "https://example.test/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(todoUser);

  // 2. Create a todo list under the todoUser context
  const listRequest = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    {
      body: listRequest,
    },
  );
  typia.assert(list);

  // 3. Create multiple tasks with varying dueDate and isCompleted
  const now = Date.now();
  const overdueIso = new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days ago
  const upcomingIso = new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString(); // in 7 days

  const createdTasks: ITodoAppTask[] = [];

  // Completed task
  const completedTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: {
        title: "Completed task",
        description: "This task is already completed",
        isCompleted: true,
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(completedTask);
  createdTasks.push(completedTask);

  // Overdue task
  const overdueTask = await api.functional.todoApp.todoUser.lists.tasks.create(
    connection,
    {
      listId: list.id,
      body: {
        title: "Overdue task",
        description: "Should be overdue",
        isCompleted: false,
        dueDate: overdueIso,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(overdueTask);
  createdTasks.push(overdueTask);

  // Upcoming task
  const upcomingTask = await api.functional.todoApp.todoUser.lists.tasks.create(
    connection,
    {
      listId: list.id,
      body: {
        title: "Upcoming task",
        description: "Due in the future",
        isCompleted: false,
        dueDate: upcomingIso,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(upcomingTask);
  createdTasks.push(upcomingTask);

  // 4. Add a collaborator to the list (use the same todoUser id as a valid collaborator)
  const collaborator: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      connection,
      {
        listId: list.id,
        body: {
          todoAppTodouserId: todoUser.id,
          role: "read-write",
        } satisfies ITodoAppListCollaborator.ICreate,
      },
    );
  typia.assert(collaborator);

  // 5. Create an invitation for an external email
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const invitationBody = {
    invitee_email: inviteeEmail,
    message: "Please join my list",
  } satisfies ITodoAppInvitation.ICreate;

  const invitation: ITodoAppInvitation =
    await api.functional.todoApp.todoUser.lists.invitations.create(connection, {
      listId: list.id,
      body: invitationBody,
    });
  typia.assert(invitation);

  // 6. Create an admin account to call admin-only endpoint (switches auth)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        display_name: RandomGenerator.name(),
        role: "superadmin",
        href: "https://example.test/admin-signup",
        referrer: "https://example.test/",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 7. Call the admin dashboard overview endpoint
  const dashboard: ITodoAppAdminDashboard =
    await api.functional.todoApp.admin.dashboard.admin_overview.at(connection);
  typia.assert(dashboard);

  // 8. Business-level validations
  TestValidator.predicate(
    "dashboard totals exist and total_lists >= 1",
    dashboard.totals.total_lists >= 1,
  );
  TestValidator.predicate(
    "dashboard total_tasks >= created tasks",
    dashboard.taskStats.total_tasks >= createdTasks.length,
  );
  TestValidator.predicate(
    "dashboard completed_tasks >= 1",
    dashboard.taskStats.completed_tasks >= 1,
  );
  TestValidator.predicate(
    "dashboard completion_rate between 0 and 1",
    dashboard.taskStats.completion_rate >= 0 &&
      dashboard.taskStats.completion_rate <= 1,
  );
  TestValidator.predicate(
    "pending_invitations >= 1",
    dashboard.totals.pending_invitations >= 1,
  );

  // Capped arrays are present and respect cap <= 10 when included
  TestValidator.predicate(
    "topLists capped to 10 or undefined",
    dashboard.topLists === undefined || dashboard.topLists.length <= 10,
  );
  TestValidator.predicate(
    "recentAdminActions capped to 10 or undefined",
    dashboard.recentAdminActions === undefined ||
      dashboard.recentAdminActions.length <= 10,
  );
  TestValidator.predicate(
    "recentInvitations capped to 10 or undefined",
    dashboard.recentInvitations === undefined ||
      dashboard.recentInvitations.length <= 10,
  );
  TestValidator.predicate(
    "users sample capped to 10 or undefined",
    dashboard.users === undefined || dashboard.users.length <= 10,
  );

  // Ensure no sensitive fields are leaked in dashboard root (business rule)
  TestValidator.predicate(
    "no sensitive fields leaked",
    !("password_hash" in (dashboard as any)) &&
      !("mfa_secret" in (dashboard as any)) &&
      !("refresh_tokens_revoked_at" in (dashboard as any)),
  );

  // typia.assert already validates generatedAt is a date-time string
}
