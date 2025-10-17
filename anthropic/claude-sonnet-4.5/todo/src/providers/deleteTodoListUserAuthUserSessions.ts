import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSessionRevocationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSessionRevocationResult";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserAuthUserSessions(props: {
  user: UserPayload;
}): Promise<ITodoListSessionRevocationResult> {
  const { user } = props;

  const revokedAt = toISOStringSafe(new Date());

  const result = await MyGlobal.prisma.todo_list_refresh_tokens.updateMany({
    where: {
      todo_list_user_id: user.id,
      revoked_at: null,
    },
    data: {
      revoked_at: revokedAt,
    },
  });

  const count = Number(result.count) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  return {
    count,
    message: `Successfully revoked ${count} active session(s). You will need to log in again on all devices.`,
  };
}
