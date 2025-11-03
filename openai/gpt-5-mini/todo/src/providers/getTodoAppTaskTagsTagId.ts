import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";

export async function getTodoAppTaskTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTaskTag> {
  const { tagId } = props;

  const record = await MyGlobal.prisma.todo_app_task_tags.findUnique({
    where: { id: tagId },
    select: {
      id: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!record) {
    throw new HttpException("Not Found", 404);
  }

  if (record.deleted_at !== null) {
    // Soft-deleted rows are treated as not found for public consumers
    throw new HttpException("Not Found", 404);
  }

  return {
    id: record.id as string & tags.Format<"uuid">,
    name: record.name,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  } satisfies ITodoAppTaskTag;
}
