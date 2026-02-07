import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppProfileEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppProfileEdit";
import { ITodoAppProfileEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfileEdit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserProfileEdits(props: {
  user: UserPayload;
}): Promise<IPageITodoAppProfileEdit> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.todo_app_profile_edits.findMany({
    where: {
      todo_app_user_id: props.user.id,
    },
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    select: {
      original_display_name: true,
      new_display_name: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_profile_edits.count({
    where: {
      todo_app_user_id: props.user.id,
    },
  });
  return {
    data: data.map((edit) => ({
      original_display_name: edit.original_display_name,
      new_display_name: edit.new_display_name,
      created_at: toISOStringSafe(edit.created_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
