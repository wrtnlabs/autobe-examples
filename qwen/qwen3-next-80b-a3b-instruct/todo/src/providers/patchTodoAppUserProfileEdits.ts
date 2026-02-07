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

export async function patchTodoAppUserProfileEdits(props: {
  user: UserPayload;
  body: ITodoAppProfileEdit.IRequest;
}): Promise<IPageITodoAppProfileEdit.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_user_id: props.user.id,
  } satisfies Prisma.todo_app_profile_editsWhereInput;
  const data = await MyGlobal.prisma.todo_app_profile_edits.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    } as const,
  });
  const total = await MyGlobal.prisma.todo_app_profile_edits.count({
    where: whereInput,
  });
  return {
    data: data.map((edit) => ({
      id: edit.id,
      todo_app_user_id: edit.todo_app_user_id,
      original_display_name: edit.original_display_name,
      new_display_name: edit.new_display_name,
      created_at: toISOStringSafe(edit.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
