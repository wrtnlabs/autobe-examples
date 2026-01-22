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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { TodoListAdminAtSummaryTransformer } from "../transformers/TodoListAdminAtSummaryTransformer";

export async function getAuthAdminProfile(props: {
  admin: AdminPayload;
}): Promise<ITodoListAdmin.ISummary> {
  const admin = await MyGlobal.prisma.todo_list_admin.findUnique({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    ...TodoListAdminAtSummaryTransformer.select(),
  });
  if (!admin) {
    throw new HttpException("Admin profile not found", 404);
  }
  return await TodoListAdminAtSummaryTransformer.transform(admin);
}
