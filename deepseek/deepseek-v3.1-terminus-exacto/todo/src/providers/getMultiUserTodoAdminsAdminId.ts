import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoAdminTransformer } from "../transformers/MultiUserTodoAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAdminsAdminId(props: {
  adminId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoAdmin> {
  const admin = await MyGlobal.prisma.multi_user_todo_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    ...MultiUserTodoAdminTransformer.select(),
  });
  return await MultiUserTodoAdminTransformer.transform(admin);
}
