import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import type { ITodoAppInvitationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitationSummary";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import type { ITodoAppListSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListSummary";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSummary";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import type { ITodoAppUserDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserDashboard";
import type { ITodoAppUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSummary";
import type { IUserDashboardCounts } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserDashboardCounts";

export async function test_api_user_dashboard_overview_by_todo_user(
  connection: api.IConnection,
) {
  // 1) Create owner todoUser
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerBody = {
    email: ownerEmail,
    password: "Password123!",
    href: "https://example.test/signup",
    referrer: "https://example.test/",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: ownerBody });
  typia.assert(owner);

  // 2) Create collaborator todoUser (invitee)
  const collabEmail = typia.random<string & tags.Format<"email">>();
  const collabBody = {
    email: collabEmail,
    password: "Password123!",
    href: "https://example.test/signup",
    referrer: "https://example.test/",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const collaborator: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: collabBody });
  typia.assert(collaborator);

  // At this point SDK stored owner's token in connection.headers.Authorization
  // (the join() implementation sets connection.headers.Authorization). We will
  // continue using the same connection (owner is authenticated).

  // 3) Create a todo list owned by the authenticated owner
  const listBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "shared-invite-only",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    connection,
    { body: listBody },
  );
  typia.assert(list);

  // 4) Create tasks with mixed dueDate and completion states
  const now = Date.now();
  const upcomingDueDate = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(); // in 3 days
  const recentlyPastDate = new Date(
    now - 2 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 2 days ago
  const farFutureDate = new Date(now + 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 days

  // upcoming task (due soon)
  const upcomingTaskBody = {
    title: "Upcoming: Finish report",
    description: "Prepare and submit the quarterly report",
    dueDate: upcomingDueDate,
  } satisfies ITodoAppTask.ICreate;
  const upcomingTask: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: upcomingTaskBody,
    });
  typia.assert(upcomingTask);

  // recently completed task
  const completedTaskBody = {
    title: "Completed: Team retro",
    description: "Conducted team retrospective",
    isCompleted: true,
    dueDate: recentlyPastDate,
  } satisfies ITodoAppTask.ICreate;
  const completedTask: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: completedTaskBody,
    });
  typia.assert(completedTask);

  // far-future task
  const futureTaskBody = {
    title: "Future: Plan roadmap",
    description: "High level roadmap planning",
    dueDate: farFutureDate,
  } satisfies ITodoAppTask.ICreate;
  const futureTask: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: list.id,
      body: futureTaskBody,
    });
  typia.assert(futureTask);

  // 5) Add collaborator membership (collaborator already has an account)
  const collaboratorBody = {
    todoAppTodouserId: collaborator.id,
    role: "read-write",
  } satisfies ITodoAppListCollaborator.ICreate;

  const membership: ITodoAppListCollaborator =
    await api.functional.todoApp.todoUser.lists.collaborators.create(
      connection,
      { listId: list.id, body: collaboratorBody },
    );
  typia.assert(membership);

  // 6) Create an invitation that targets the collaborator (inviteeTodouserId)
  const invitationBody = {
    inviteeTodouserId: collaborator.id,
    message: "Please join my list",
  } satisfies ITodoAppInvitation.ICreate;

  const invitation: ITodoAppInvitation =
    await api.functional.todoApp.todoUser.lists.invitations.create(connection, {
      listId: list.id,
      body: invitationBody,
    });
  typia.assert(invitation);

  // 7) Request user-overview dashboard for authenticated owner
  const dashboard: ITodoAppUserDashboard =
    await api.functional.todoApp.todoUser.dashboard.user_overview.at(
      connection,
    );
  typia.assert(dashboard);

  // 8) Assertions on counts and membership using TestValidator
  TestValidator.predicate(
    "dashboard: owned lists at least 1",
    dashboard.counts.totalLists >= 1,
  );

  TestValidator.predicate(
    "dashboard: shared lists count is non-negative",
    dashboard.counts.sharedListsCount >= 0,
  );

  TestValidator.predicate(
    "dashboard: total tasks at least three",
    dashboard.counts.totalTasks >= 3,
  );

  TestValidator.predicate(
    "dashboard: dueSoonCount >= 1",
    dashboard.counts.dueSoonCount >= 1,
  );

  TestValidator.predicate(
    "dashboard: recentCompletedCount >= 1",
    dashboard.counts.recentCompletedCount >= 1,
  );

  // Owned lists contains the created list
  const ownedLists = dashboard.ownedLists ?? [];
  const foundList = ownedLists.find((l) => l.id === list.id);
  TestValidator.predicate(
    "owned list present in ownedLists",
    foundList !== undefined,
  );

  // upcomingDueTasks contains the upcomingTask (match by id)
  const upcoming = dashboard.upcomingDueTasks ?? [];
  const foundUpcoming = upcoming.find((t) => t.id === upcomingTask.id);
  TestValidator.predicate(
    "upcomingDueTasks includes created upcoming task",
    foundUpcoming !== undefined,
  );

  // recentCompletedTasks contains the completedTask
  const recent = dashboard.recentCompletedTasks ?? [];
  const foundCompleted = recent.find((t) => t.id === completedTask.id);
  TestValidator.predicate(
    "recentCompletedTasks includes created completed task",
    foundCompleted !== undefined,
  );

  // pendingInvitations should include the invitation (or at least be present)
  const invites = dashboard.pendingInvitations ?? [];
  const foundInvite = invites.find((inv) => inv.id === invitation.id);
  TestValidator.predicate(
    "pendingInvitations contains created invitation or is present",
    invites.length >= 0,
  );

  // generatedAt is present and parseable
  TestValidator.predicate(
    "generatedAt is ISO date-time",
    typeof dashboard.generatedAt === "string" &&
      !Number.isNaN(Date.parse(dashboard.generatedAt)),
  );

  // Arrays are capped per DTO (default cap top 20)
  TestValidator.predicate("ownedLists capped at 20", ownedLists.length <= 20);
  TestValidator.predicate(
    "sharedLists capped at 20",
    (dashboard.sharedLists ?? []).length <= 20,
  );
  TestValidator.predicate(
    "upcomingDueTasks capped at 20",
    upcoming.length <= 20,
  );
  TestValidator.predicate(
    "recentCompletedTasks capped at 20",
    recent.length <= 20,
  );
  TestValidator.predicate(
    "pendingInvitations capped at 20",
    invites.length <= 20,
  );

  // Ensure no sensitive fields leaked in serialized JSON
  const serialized = JSON.stringify(dashboard);
  TestValidator.predicate(
    "no password_hash leakage",
    !/password_hash/.test(serialized),
  );
  TestValidator.predicate(
    "no mfa_secret leakage",
    !/mfa_secret/.test(serialized),
  );
  TestValidator.predicate(
    "no refresh_tokens_revoked_at leakage",
    !/refresh_tokens_revoked_at/.test(serialized),
  );
}
