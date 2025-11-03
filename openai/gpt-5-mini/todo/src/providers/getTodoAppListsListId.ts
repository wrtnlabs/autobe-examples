import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function getTodoAppListsListId(props: {
  listId: string & tags.Format<"uuid">;
}): Promise<ITodoAppList> {
  const { listId } = props;

  const list = await MyGlobal.prisma.todo_app_lists.findUnique({
    where: { id: listId },
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
  });

  if (!list) throw new HttpException("Not Found", 404);

  // Treat caller as public (no authentication provided in props)
  if (list.visibility !== "public") {
    // Policy: do not reveal existence of private/shared lists to unauthenticated callers
    throw new HttpException("Not Found", 404);
  }

  const visibility =
    list.visibility === "public"
      ? "public"
      : list.visibility === "private"
        ? "private"
        : "shared-invite-only";

  const owner = {
    id: list.owner.id,
    displayName: list.owner.display_name ?? null,
    isVerified: list.owner.is_verified,
    status: list.owner.status ?? undefined,
    createdAt: toISOStringSafe(list.owner.created_at),
    updatedAt: toISOStringSafe(list.owner.updated_at),
  } satisfies ITodoAppTodoUser.ISummary;

  return {
    id: list.id,
    title: list.title,
    description: list.description ?? null,
    visibility: visibility,
    owner: owner,
    createdAt: toISOStringSafe(list.created_at),
    updatedAt: toISOStringSafe(list.updated_at),
    deletedAt: list.deleted_at ? toISOStringSafe(list.deleted_at) : undefined,
  } satisfies ITodoAppList;
}
