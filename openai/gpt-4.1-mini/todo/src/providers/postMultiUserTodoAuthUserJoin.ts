import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthUserJoin(props: {
  body: IMultiUserTodoUser.IJoin;
}): Promise<IMultiUserTodoUser.IAuthorized> {
  // Since IJoin has no properties, no email or password can be processed
  // Check if there is any user at all - demonstration only
  const count = await MyGlobal.prisma.multi_user_todo_users.count();
  if (count > 0)
    throw new HttpException("User join is not supported with empty input", 400);
  // Since no creation data, cannot create new user
  throw new HttpException("User join data is missing", 400);
}
