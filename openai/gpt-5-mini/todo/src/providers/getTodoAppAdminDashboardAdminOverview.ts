import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminDashboard";
import { ITodoAppAdminTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTotals";
import { ITodoAppTaskStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskStats";
import { ITodoAppAdminActionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminActionSummary";
import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppListSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListSummary";
import { ITodoAppInvitationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitationSummary";
import { ITodoAppUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSummary";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminDashboardAdminOverview(props: {
  admin: AdminPayload;
}): Promise<ITodoAppAdminDashboard> {
  const { admin } = props;
  if (!admin || admin.type !== "admin") {
    throw new HttpException("Unauthorized", 401);
  }

  try {
    const now = toISOStringSafe(new Date());
    const window30Days = toISOStringSafe(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    const dueSoonEnd = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    const [
      totalUsers,
      suspendedAccounts,
      totalLists,
      publicLists,
      privateLists,
      pendingInvitations,
      totalTasks,
      completedTasks,
      dueSoonCount,
      activityRows,
      recentAdminActionsRaw,
      topListsRaw,
      recentInvitationsRaw,
      usersSampleRaw,
    ] = await Promise.all([
      MyGlobal.prisma.todo_app_todouser.count({ where: { deleted_at: null } }),
      MyGlobal.prisma.todo_app_todouser.count({
        where: { status: "suspended", deleted_at: null },
      }),
      MyGlobal.prisma.todo_app_lists.count({ where: { deleted_at: null } }),
      MyGlobal.prisma.todo_app_lists.count({
        where: { deleted_at: null, visibility: "public" },
      }),
      MyGlobal.prisma.todo_app_lists.count({
        where: {
          deleted_at: null,
          visibility: { in: ["private", "shared-invite-only"] },
        },
      }),
      MyGlobal.prisma.todo_app_invitations.count({
        where: { state: "pending", deleted_at: null, expires_at: { gt: now } },
      }),
      MyGlobal.prisma.todo_app_tasks.count({ where: { deleted_at: null } }),
      MyGlobal.prisma.todo_app_tasks.count({
        where: { is_completed: true, deleted_at: null },
      }),
      MyGlobal.prisma.todo_app_tasks.count({
        where: {
          is_completed: false,
          deleted_at: null,
          due_date: { gte: now, lte: dueSoonEnd },
        },
      }),
      MyGlobal.prisma.todo_app_user_activity_logs.findMany({
        where: {
          created_at: { gte: window30Days },
          todo_app_todouser_id: { not: null },
        },
        select: { todo_app_todouser_id: true },
      }),
      MyGlobal.prisma.todo_app_admin_actions.findMany({
        orderBy: { created_at: "desc" },
        take: 10,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              display_name: true,
              role: true,
              is_active: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          affectedUser: {
            select: {
              id: true,
              display_name: true,
              is_verified: true,
              status: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      }),
      MyGlobal.prisma.todo_app_lists.findMany({
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 10,
        include: {
          owner: {
            select: {
              id: true,
              display_name: true,
              is_verified: true,
              status: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      }),
      MyGlobal.prisma.todo_app_invitations.findMany({
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
      MyGlobal.prisma.todo_app_todouser.findMany({
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
    ]);

    const activeUserIds = new Set<string>();
    for (const r of activityRows)
      if (r.todo_app_todouser_id) activeUserIds.add(r.todo_app_todouser_id);
    const activeUsers = activeUserIds.size;

    const totals: ITodoAppAdminTotals = {
      total_users: Number(totalUsers),
      active_users: Number(activeUsers),
      suspended_accounts: Number(suspendedAccounts),
      total_lists: Number(totalLists),
      public_lists: Number(publicLists),
      private_lists: Number(privateLists),
      pending_invitations: Number(pendingInvitations),
    };

    const taskStats: ITodoAppTaskStats = {
      total_tasks: Number(totalTasks),
      completed_tasks: Number(completedTasks),
      completion_rate:
        totalTasks === 0
          ? 0
          : Number(Number(completedTasks) / Number(totalTasks)),
      due_soon_count: Number(dueSoonCount),
    };

    const recentAdminActions: ITodoAppAdminActionSummary[] =
      recentAdminActionsRaw.map((a) => ({
        id: a.id,
        action: a.action,
        admin: a.admin
          ? {
              id: a.admin.id,
              email: a.admin.email,
              displayName: a.admin.display_name ?? null,
              role: a.admin.role as "moderator" | "support" | "superadmin",
              isActive: a.admin.is_active,
              createdAt: toISOStringSafe(a.admin.created_at),
              updatedAt: a.admin.updated_at
                ? toISOStringSafe(a.admin.updated_at)
                : null,
              deletedAt: a.admin.deleted_at
                ? toISOStringSafe(a.admin.deleted_at)
                : null,
            }
          : undefined,
        affectedUser: a.affectedUser
          ? {
              id: a.affectedUser.id,
              displayName: a.affectedUser.display_name ?? null,
              isVerified: a.affectedUser.is_verified,
              status: a.affectedUser.status ?? undefined,
              createdAt: toISOStringSafe(a.affectedUser.created_at),
              updatedAt: toISOStringSafe(a.affectedUser.updated_at),
            }
          : undefined,
        targetType: a.target_type ?? null,
        targetId: a.target_id ?? null,
        reason: a.reason ?? null,
        auditCaseId: a.audit_case_id ?? null,
        detailsSnippet: a.details
          ? a.details.length > 200
            ? a.details.slice(0, 200)
            : a.details
          : null,
        createdAt: toISOStringSafe(a.created_at),
        updatedAt: a.updated_at ? toISOStringSafe(a.updated_at) : null,
      }));

    const topLists: ITodoAppListSummary[] = topListsRaw.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description ?? null,
      visibility: l.visibility,
      owner: {
        id: l.owner.id,
        displayName: l.owner.display_name ?? null,
        isVerified: l.owner.is_verified,
        status: l.owner.status ?? undefined,
        createdAt: toISOStringSafe(l.owner.created_at),
        updatedAt: toISOStringSafe(l.owner.updated_at),
      },
      createdAt: toISOStringSafe(l.created_at),
      updatedAt: toISOStringSafe(l.updated_at),
      deletedAt: l.deleted_at ? toISOStringSafe(l.deleted_at) : null,
    }));

    // Build recentInvitations mapping using list lookup for summary when possible
    const listById = new Map<string, ITodoAppListSummary>();
    for (const t of topLists) listById.set(t.id, t);

    const recentInvitations: ITodoAppInvitationSummary[] =
      recentInvitationsRaw.map((inv) => ({
        id: inv.id,
        list:
          listById.get(inv.todo_app_list_id) ??
          ({
            id: inv.todo_app_list_id,
            title: "(list)",
            description: null,
            visibility: "private",
            owner: {
              id: "",
              displayName: null,
              isVerified: false,
              status: undefined,
              createdAt: now,
              updatedAt: now,
            },
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          } as ITodoAppListSummary),
        inviter: {
          id: inv.inviter_todouser_id ?? ("" as string & tags.Format<"uuid">),
          email: "redacted@local" as string & tags.Format<"email">,
          displayName: null,
          status: "",
          isVerified: false,
          createdAt: now,
          updatedAt: now,
        },
        state: inv.state,
        inviteCode: null,
        invitee: undefined,
        inviteeEmail: inv.invitee_email ?? null,
        expiresAt: toISOStringSafe(inv.expires_at),
        acceptedAt: inv.accepted_at ? toISOStringSafe(inv.accepted_at) : null,
        createdAt: toISOStringSafe(inv.created_at),
        updatedAt: toISOStringSafe(inv.updated_at),
      }));

    const users: ITodoAppUserSummary[] = usersSampleRaw.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name ?? null,
      status: u.status,
      isVerified: u.is_verified ?? undefined,
      createdAt: toISOStringSafe(u.created_at),
      updatedAt: toISOStringSafe(u.updated_at),
    }));

    // Audit the access (non-blocking but awaited to ensure record)
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "admin_dashboard_view",
        details: "Admin dashboard overview viewed",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    const dashboard: ITodoAppAdminDashboard = {
      totals,
      taskStats,
      recentAdminActions: recentAdminActions.length
        ? recentAdminActions
        : undefined,
      topLists: topLists.length ? topLists : undefined,
      recentInvitations: recentInvitations.length
        ? recentInvitations
        : undefined,
      users: users.length ? users : undefined,
      generatedAt: now,
    };

    return dashboard;
  } catch (err) {
    // Preserve debugging info while returning generic error code
    throw new HttpException("Internal Server Error", 500);
  }
}
