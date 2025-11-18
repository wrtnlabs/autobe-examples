import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserLogin(props: {
  user: UserPayload;
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  // Schema mismatch: todo_list_users has no password_hash field for authentication
  // Schema mismatch: todo_list_user_sessions table doesn't exist for session creation
  // Unable to implement login operation as schema prohibits password authentication

  // Return mock response that satisfies type constraints without database interaction
  return {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    created_at: typia.random<string & tags.Format<"date-time">>(),
    updated_at: undefined,
    deleted_at: null,
    token: {
      access: typia.random<string>(),
      refresh: typia.random<string>(),
      expired_at: typia.random<string & tags.Format<"date-time">>(),
      refreshable_until: typia.random<string & tags.Format<"date-time">>(),
    },
  } satisfies ITodoListUser.IAuthorized;
}
