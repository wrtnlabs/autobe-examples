import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListShare";
import { IPageITodoAppListShare } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppListShare";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoAppTodoUserListsListIdShares(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
  body: ITodoAppListShare.IRequest;
}): Promise<IPageITodoAppListShare.ISummary> {
  const { todoUser, listId, body } = props;

  // Verify parent list exists and is not soft-deleted
  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
    include: { owner: true },
  });

  if (!list || list.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: owner or collaborator
  const isOwner = list.todo_app_todouser_id === todoUser.id;
  if (!isOwner) {
    const membership =
      await MyGlobal.prisma.todo_app_list_collaborators.findFirst({
        where: {
          todo_app_list_id: listId,
          todo_app_todouser_id: todoUser.id,
          deleted_at: null,
        },
      });
    if (!membership)
      throw new HttpException(
        "Unauthorized: Only the owner or collaborators may access list shares",
        403,
      );
  }

  // includeDeleted is admin-only in DTO; this endpoint only receives todoUser
  if (body.includeDeleted === true) {
    throw new HttpException(
      "Forbidden: includeDeleted requires elevated privileges",
      403,
    );
  }

  const page = Number(body.page ?? 1);
  const limit = Math.min(Math.max(Number(body.pageSize ?? 20), 1), 100);
  const skip = (page - 1) * limit;

  // Build where condition inline in Prisma calls
  const whereCommon = {
    todo_app_list_id: listId,
    deleted_at: null,
    ...(body.isPublic !== undefined &&
      body.isPublic !== null && { is_public: body.isPublic }),
    ...(body.visibility !== undefined &&
      body.visibility !== null && { visibility: body.visibility }),
    ...((body.expiresBefore !== undefined && body.expiresBefore !== null) ||
    (body.expiresAfter !== undefined && body.expiresAfter !== null)
      ? {
          expires_at: {
            ...(body.expiresAfter !== undefined &&
              body.expiresAfter !== null && { gt: body.expiresAfter }),
            ...(body.expiresBefore !== undefined &&
              body.expiresBefore !== null && { lt: body.expiresBefore }),
          },
        }
      : {}),
  } as const;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_list_shares.findMany({
      where: whereCommon,
      orderBy:
        body.sortBy === "updatedAt"
          ? { updated_at: body.order === "desc" ? "desc" : "asc" }
          : body.sortBy === "expiresAt"
            ? { expires_at: body.order === "desc" ? "desc" : "asc" }
            : { created_at: body.order === "desc" ? "desc" : "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        public_url: true,
        is_public: true,
        visibility: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
      },
    }),

    MyGlobal.prisma.todo_app_list_shares.count({ where: whereCommon }),
  ]);

  const listSummary: ITodoAppList.ISummary = {
    id: list.id,
    title: list.title,
    visibility: typia.assert<"shared-invite-only" | "public" | "shared">(
      list.visibility as unknown as string,
    ),
    owner: {
      id: list.owner.id,
      displayName: list.owner.display_name ?? null,
      isVerified: list.owner.is_verified,
      status: list.owner.status ?? undefined,
      createdAt: toISOStringSafe(list.owner.created_at),
      updatedAt: toISOStringSafe(list.owner.updated_at),
    },
    description: list.description ?? null,
    createdAt: toISOStringSafe(list.created_at),
    updatedAt: toISOStringSafe(list.updated_at),
    deletedAt: list.deleted_at ? toISOStringSafe(list.deleted_at) : null,
  };

  const data = rows.map((r) => ({
    id: r.id,
    list: listSummary,
    publicUrl: r.public_url ?? null,
    isPublic: r.is_public,
    visibility: typia.assert<"shared-invite-only" | "public" | "shared">(
      r.visibility as unknown as string,
    ),
    expiresAt: r.expires_at ? toISOStringSafe(r.expires_at) : null,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
