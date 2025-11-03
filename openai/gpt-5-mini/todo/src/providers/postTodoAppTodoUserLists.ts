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
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function postTodoAppTodoUserLists(props: {
  todoUser: TodouserPayload;
  body: ITodoAppList.ICreate;
}): Promise<ITodoAppList> {
  const { todoUser, body } = props;

  // Business validations
  const title = (body.title ?? "").trim();
  if (!title) throw new HttpException("Bad Request: title is required", 400);

  if (body.description !== undefined && body.description !== null) {
    const desc = body.description;
    if (typeof desc === "string" && desc.length > 4000)
      throw new HttpException(
        "Bad Request: description must not exceed 4000 characters",
        400,
      );
  }

  const visibility = body.visibility ?? "private";

  const now = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const list = await tx.todo_app_lists.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_todouser_id: todoUser.id,
          title,
          description: body.description ?? null,
          visibility,
          created_at: now,
          updated_at: now,
        },
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

      if (visibility === "public") {
        await tx.todo_app_public_index_preferences.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            todo_app_list_id: list.id,
            indexing_enabled: true,
            allow_search_engine: true,
            allow_discovery: true,
            index_scope: null,
            created_at: now,
            updated_at: now,
          },
        });
      }

      await tx.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_todouser_id: todoUser.id,
          todo_app_list_id: list.id,
          event_type: "create",
          target_type: "list",
          details: `List created: ${title}`,
          created_at: now,
          updated_at: now,
        },
      });

      return list;
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      title: created.title,
      description: created.description ?? null,
      visibility: created.visibility as
        | "private"
        | "shared-invite-only"
        | "public",
      owner: {
        id: created.owner.id as string & tags.Format<"uuid">,
        displayName: created.owner.display_name ?? null,
        isVerified: created.owner.is_verified,
        status: created.owner.status ?? undefined,
        createdAt: toISOStringSafe(created.owner.created_at),
        updatedAt: toISOStringSafe(created.owner.updated_at),
      },
      createdAt: toISOStringSafe(created.created_at),
      updatedAt: toISOStringSafe(created.updated_at),
      deletedAt: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Conflict: a list with the same title already exists for this user",
        409,
      );
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
