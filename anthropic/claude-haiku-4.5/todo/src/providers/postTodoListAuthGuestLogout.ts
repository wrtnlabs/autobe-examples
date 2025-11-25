import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuth";

export async function postTodoListAuthGuestLogout(): Promise<ITodoListAuth.IGuestLogoutResponse> {
  return {
    success: true,
    message: "Guest session successfully terminated",
  };
}
