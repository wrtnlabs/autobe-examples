import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserDashboard";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IUserDashboardCounts } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserDashboardCounts";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTaskSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskSummary";
import { ITodoAppInvitationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitationSummary";
import { ITodoAppListSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListSummary";
import { ITodoAppUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSummary";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserDashboardUserOverview(props: {
  todoUser: TodouserPayload;
}): Promise<ITodoAppUserDashboard> {
  const { todoUser } = props;

  try {
    const user = await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
      where: { id: todoUser.id },
      select: {
        id: true,
        email: true,
        display_name: true,
        is_verified: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    if (user.deleted_at !== null) {
      throw new HttpException("Unauthorized", 401);
    }

    const now = toISOStringSafe(new Date());
    const next7 = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    const sevenDaysAgo = toISOStringSafe(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );

    const [
      totalLists,
      sharedListsCount,
      totalTasks,
      dueSoonCount,
      recentCompletedCount,
    ] = await Promise.all([
      MyGlobal.prisma.todo_app_lists.count({
        where: { todo_app_todouser_id: todoUser.id, deleted_at: null },
      }),
      MyGlobal.prisma.todo_app_list_collaborators.count({
        where: {
          todo_app_todouser_id: todoUser.id,
          deleted_at: null,
          list: { deleted_at: null },
        },
      }),
      MyGlobal.prisma.todo_app_tasks.count({
        where: {
          list: { todo_app_todouser_id: todoUser.id, deleted_at: null },
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.todo_app_tasks.count({
        where: {
          list: { todo_app_todouser_id: todoUser.id, deleted_at: null },
          deleted_at: null,
          is_completed: false,
          due_date: { gte: now, lte: next7 },
        },
      }),
      MyGlobal.prisma.todo_app_tasks.count({
        where: {
          list: { todo_app_todouser_id: todoUser.id, deleted_at: null },
          deleted_at: null,
          is_completed: true,
          completed_at: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const [
      ownedListsRows,
      collaboratorRows,
      upcomingTasksRows,
      recentCompletedRows,
      invitationsRows,
    ] = await Promise.all([
      MyGlobal.prisma.todo_app_lists.findMany({
        where: { todo_app_todouser_id: todoUser.id, deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 20,
        include: { owner: true },
      }),
      MyGlobal.prisma.todo_app_list_collaborators.findMany({
        where: {
          todo_app_todouser_id: todoUser.id,
          deleted_at: null,
          list: { deleted_at: null },
        },
        orderBy: { created_at: "desc" },
        take: 40,
        include: { list: { include: { owner: true } } },
      }),
      MyGlobal.prisma.todo_app_tasks.findMany({
        where: {
          list: { todo_app_todouser_id: todoUser.id, deleted_at: null },
          deleted_at: null,
          is_completed: false,
          due_date: { gte: now, lte: next7 },
        },
        orderBy: { due_date: "asc" },
        take: 20,
        include: { list: { include: { owner: true } } },
      }),
      MyGlobal.prisma.todo_app_tasks.findMany({
        where: {
          list: { todo_app_todouser_id: todoUser.id, deleted_at: null },
          deleted_at: null,
          is_completed: true,
          completed_at: { gte: sevenDaysAgo },
        },
        orderBy: { completed_at: "desc" },
        take: 20,
        include: { list: { include: { owner: true } } },
      }),
      MyGlobal.prisma.todo_app_invitations.findMany({
        where: {
          deleted_at: null,
          state: "pending",
          OR: [
            { invitee_todouser_id: todoUser.id },
            { invitee_email: user.email },
          ],
        },
        orderBy: { created_at: "desc" },
        take: 20,
        include: { list: true, inviter: true, invitee: true },
      }),
    ]);

    const mapOwnerToSummary = (ownerRecord: any) => ({
      id: ownerRecord.id,
      email: ownerRecord.email ?? null,
      displayName: ownerRecord.display_name ?? null,
      isVerified: ownerRecord.is_verified,
      status: ownerRecord.status ?? undefined,
      createdAt: toISOStringSafe(ownerRecord.created_at),
      updatedAt: toISOStringSafe(ownerRecord.updated_at),
    });

    const mapListToSummary = (listRecord: any) => ({
      id: listRecord.id,
      title: listRecord.title,
      visibility: listRecord.visibility,
      owner: mapOwnerToSummary(listRecord.owner),
      description: listRecord.description ?? null,
      createdAt: toISOStringSafe(listRecord.created_at),
      updatedAt: toISOStringSafe(listRecord.updated_at),
      deletedAt: listRecord.deleted_at
        ? toISOStringSafe(listRecord.deleted_at)
        : undefined,
    });

    const ownedLists = ownedListsRows.map(mapListToSummary);

    const sharedMap = new Map<string, any>();
    for (const coll of collaboratorRows) {
      const listRec = coll.list;
      if (!listRec || listRec.deleted_at !== null) continue;
      if (!sharedMap.has(listRec.id))
        sharedMap.set(listRec.id, mapListToSummary(listRec));
    }
    const sharedLists = Array.from(sharedMap.values()).slice(0, 20);

    const mapTaskToSummary = (task: any) => ({
      id: task.id,
      title: task.title,
      isCompleted: task.is_completed,
      completedAt: task.completed_at
        ? toISOStringSafe(task.completed_at)
        : null,
      dueDate: task.due_date ? toISOStringSafe(task.due_date) : null,
      priority: task.priority ?? null,
      createdAt: toISOStringSafe(task.created_at),
      updatedAt: toISOStringSafe(task.updated_at),
      list: mapListToSummary(task.list),
    });

    const upcomingDueTasks = upcomingTasksRows.map(mapTaskToSummary);
    const recentCompletedTasks = recentCompletedRows.map(mapTaskToSummary);

    const pendingInvitations = invitationsRows.map((inv: any) => {
      const listSummary = inv.list ? mapListToSummary(inv.list) : (null as any);
      const inviterSummary = inv.inviter
        ? mapOwnerToSummary(inv.inviter)
        : (null as any);
      const isOwner = inv.list && inv.list.todo_app_todouser_id === todoUser.id;
      const isInvitee = inv.invitee_todouser_id === todoUser.id;

      return {
        id: inv.id,
        list: listSummary,
        inviter: inviterSummary,
        state: inv.state,
        inviteCode: isOwner || isInvitee ? inv.invite_code : null,
        invitee: inv.invitee
          ? inv.invitee.id
            ? mapOwnerToSummary(inv.invitee)
            : null
          : null,
        inviteeEmail: inv.invitee_email ?? null,
        expiresAt: toISOStringSafe(inv.expires_at),
        acceptedAt: inv.accepted_at ? toISOStringSafe(inv.accepted_at) : null,
        createdAt: toISOStringSafe(inv.created_at),
        updatedAt: toISOStringSafe(inv.updated_at),
      };
    });

    const result: ITodoAppUserDashboard = {
      user: {
        id: user.id,
        displayName: user.display_name ?? null,
        isVerified: user.is_verified,
        status: user.status ?? undefined,
        createdAt: toISOStringSafe(user.created_at),
        updatedAt: toISOStringSafe(user.updated_at),
      },
      counts: {
        totalLists: Number(totalLists),
        sharedListsCount: Number(sharedListsCount),
        totalTasks: Number(totalTasks),
        dueSoonCount: Number(dueSoonCount),
        recentCompletedCount: Number(recentCompletedCount),
      },
      ownedLists: ownedLists,
      sharedLists: sharedLists,
      upcomingDueTasks: upcomingDueTasks,
      recentCompletedTasks: recentCompletedTasks,
      pendingInvitations: pendingInvitations,
      generatedAt: toISOStringSafe(new Date()),
    };

    return result;
  } catch (error: any) {
    if (error && error.code === "P2025") {
      throw new HttpException("Unauthorized", 401);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
