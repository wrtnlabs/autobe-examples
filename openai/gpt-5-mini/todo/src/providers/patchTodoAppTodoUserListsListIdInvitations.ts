import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppInvitation";
import { IPageITodoAppInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppInvitation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoAppTodoUserListsListIdInvitations(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  body: ITodoAppInvitation.IRequest;
}): Promise<IPageITodoAppInvitation.ISummary> {
  const { todoUser, listId, body } = props;

  // Verify the target list exists and fetch owner + collaborator info for authorization
  const list = await MyGlobal.prisma.todo_app_lists.findUniqueOrThrow({
    where: { id: listId },
    select: {
      id: true,
      todo_app_todouser_id: true,
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
      // Check collaborator membership for this caller (nullable relations filtered)
      todo_app_list_collaborators: {
        where: { todo_app_todouser_id: todoUser.id, deleted_at: null },
        select: { id: true, role: true },
      },
    },
  });

  const isOwner = list.todo_app_todouser_id === todoUser.id;
  const isCollaborator =
    Array.isArray(list.todo_app_list_collaborators) &&
    list.todo_app_list_collaborators.length > 0;
  if (!isOwner && !isCollaborator) {
    throw new HttpException("Forbidden", 403);
  }

  // includeDeleted is admin-only per API contract. Only admin actors may set it.
  if (body.includeDeleted === true) {
    throw new HttpException("Forbidden: includeDeleted is admin-only", 403);
  }

  // Build where condition inline, checking undefined/null per API types
  const whereCondition: Record<string, unknown> = {
    todo_app_list_id: listId,
    deleted_at: null,
  };

  if (body.state !== undefined) whereCondition.state = body.state;
  if (body.inviteeEmail !== undefined)
    whereCondition.invitee_email = body.inviteeEmail;
  if (body.inviteeTodouserId !== undefined && body.inviteeTodouserId !== null)
    whereCondition.invitee_todouser_id = body.inviteeTodouserId;

  if (body.expiresBefore !== undefined && body.expiresBefore !== null) {
    whereCondition.expires_at = {
      ...(whereCondition.expires_at ?? {}),
      lt: toISOStringSafe(body.expiresBefore),
    };
  }
  if (body.expiresAfter !== undefined && body.expiresAfter !== null) {
    whereCondition.expires_at = {
      ...(whereCondition.expires_at ?? {}),
      gt: toISOStringSafe(body.expiresAfter),
    };
  }

  // Pagination defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.pageSize ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  // Fetch results and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_invitations.findMany({
      where: whereCondition,
      include: {
        inviter: {
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
        invitee: {
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
        list: {
          select: {
            id: true,
            title: true,
            visibility: true,
            description: true,
            created_at: true,
            updated_at: true,
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
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_invitations.count({ where: whereCondition }),
  ] as const);

  // Map Prisma rows to API summaries
  const data = rows.map((r) => {
    const inviterSummary: ITodoAppTodoUser.ISummary = {
      id: r.inviter.id as string & tags.Format<"uuid">,
      displayName: r.inviter.display_name ?? null,
      isVerified: r.inviter.is_verified,
      status: r.inviter.status ?? undefined,
      createdAt: toISOStringSafe(r.inviter.created_at),
      updatedAt: toISOStringSafe(r.inviter.updated_at),
    };

    const listOwner = r.list.owner;
    const listSummary: ITodoAppList.ISummary = {
      id: r.list.id as string & tags.Format<"uuid">,
      title: r.list.title,
      visibility: r.list.visibility,
      owner: {
        id: listOwner.id as string & tags.Format<"uuid">,
        displayName: listOwner.display_name ?? null,
        isVerified: listOwner.is_verified,
        status: listOwner.status ?? undefined,
        createdAt: toISOStringSafe(listOwner.created_at),
        updatedAt: toISOStringSafe(listOwner.updated_at),
      },
      description: r.list.description ?? null,
      createdAt: toISOStringSafe(r.list.created_at),
      updatedAt: toISOStringSafe(r.list.updated_at),
      deletedAt: undefined,
    };

    const includeInviteCode =
      isOwner || (r.invitee && r.invitee.id === todoUser.id);

    const summary: ITodoAppInvitation.ISummary = {
      id: r.id as string & tags.Format<"uuid">,
      state: r.state as
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "revoked",
      inviteCode: includeInviteCode ? r.invite_code : null,
      inviteeEmail: r.invitee_email ?? null,
      invitee: r.invitee
        ? {
            id: r.invitee.id as string & tags.Format<"uuid">,
            displayName: r.invitee.display_name ?? null,
            isVerified: r.invitee.is_verified,
            status: r.invitee.status ?? undefined,
            createdAt: toISOStringSafe(r.invitee.created_at),
            updatedAt: toISOStringSafe(r.invitee.updated_at),
          }
        : null,
      inviter: inviterSummary,
      list: listSummary,
      expiresAt: r.expires_at ? toISOStringSafe(r.expires_at) : null,
      acceptedAt: r.accepted_at ? toISOStringSafe(r.accepted_at) : null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
    };

    return summary;
  });

  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(pages),
    },
    data,
  };
}
