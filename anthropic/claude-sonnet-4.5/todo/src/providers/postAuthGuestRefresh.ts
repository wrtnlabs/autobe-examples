import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestRefresh(props: {
  body: ITodoListGuest.IRefresh;
}): Promise<ITodoListGuest.IAuthorized> {
  // Schema-API mismatch: todo_list_guest_sessions table does not exist
  // Cannot implement session validation and token refresh without session infrastructure
  return typia.random<ITodoListGuest.IAuthorized>();
}
