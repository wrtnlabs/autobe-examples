import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { TodoListAdminTransformer } from "../transformers/TodoListAdminTransformer";

export async function getTodoListAdminsEmail(props: {
  email: string;
}): Promise<ITodoListAdmin> {
  const admin = await MyGlobal.prisma.todo_list_admin.findUnique({
    where: {
      email: props.email,
    },
    ...TodoListAdminTransformer.select(),
  });
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }
  return await TodoListAdminTransformer.transform(admin);
}
