import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppListCollaborator";
import { IPageITodoAppListCollaborator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppListCollaborator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function patchTodoAppTodoUserListsListIdCollaborators(props: {
  listId: string & tags.Format<"uuid">;
  body: ITodoAppListCollaborator.IRequest;
}): Promise<IPageITodoAppListCollaborator.ISummary> {
  const { listId, body } = props;

  const page = body.page ?? 1;
  const pageSize = Math.min(body.pageSize ?? 20, 100);

  if (page < 1 || pageSize < 1) {
    throw new HttpException(
      "Bad Request: page and pageSize must be positive integers",
      400,
    );
  }

  if (
    body.role !== undefined &&
    body.role !== null &&
    body.role !== "read-only" &&
    body.role !== "read-write"
  ) {
    throw new HttpException("Bad Request: invalid role filter", 400);
  }

  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
  });
  if (!list) throw new HttpException("Not Found: list does not exist", 404);

  const where: Record<string, unknown> = {
    todo_app_list_id: listId,
    deleted_at: null,
    ...(body.role !== undefined && body.role !== null && { role: body.role }),
    ...(body.accepted !== undefined &&
      body.accepted !== null &&
      (body.accepted ? { accepted_at: { not: null } } : { accepted_at: null })),
  };

  if (body.query) {
    (where as any).user = {
      OR: [
        { display_name: { contains: body.query } },
        { email: { contains: body.query } },
      ],
    };
  }

  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_list_collaborators.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
        addedBy: {
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
      orderBy:
        body.sortBy === "acceptedAt"
          ? { accepted_at: body.order === "desc" ? "desc" : "asc" }
          : { created_at: body.order === "desc" ? "desc" : "asc" },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.todo_app_list_collaborators.count({ where }),
  ]);

  const data = rows.map((r) => {
    const user = r.user;
    const addedBy = r.addedBy;

    const userSummary = {
      id: user.id,
      displayName: user.display_name === null ? null : user.display_name,
      isVerified: user.is_verified,
      status: user.status ?? undefined,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
    } satisfies ITodoAppTodoUser.ISummary;

    const addedBySummary = {
      id: addedBy.id,
      displayName: addedBy.display_name === null ? null : addedBy.display_name,
      isVerified: addedBy.is_verified,
      status: addedBy.status ?? undefined,
      createdAt: toISOStringSafe(addedBy.created_at),
      updatedAt: toISOStringSafe(addedBy.updated_at),
    } satisfies ITodoAppTodoUser.ISummary;

    return {
      id: r.id,
      role: typia.assert<"read-only" | "read-write">(r.role),
      user: userSummary,
      addedBy: addedBySummary,
      acceptedAt: r.accepted_at ? toISOStringSafe(r.accepted_at) : null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
    } satisfies ITodoAppListCollaborator.ISummary;
  });

  const pagination = {
    current: Number(page),
    limit: Number(pageSize),
    records: total,
    pages: Math.ceil(total / Number(pageSize)),
  } satisfies IPage.IPagination;

  return {
    pagination,
    data,
  };
}
