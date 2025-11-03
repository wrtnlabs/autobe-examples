import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserSessionsExpire(props: {
  user: UserPayload;
}): Promise<void> {
  const { user } = props;
  const nowISO = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      const result = await tx.todo_user_sessions.updateMany({
        where: {
          todo_user_id: user.id,
          expired_at: null,
        },
        data: {
          expired_at: nowISO,
        },
      });

      await tx.todo_audit_events.create({
        data: {
          id: v4(),
          todo_user_id: user.id,
          todo_user_session_id: user.session_id,
          actor_type: "user",
          category: "auth",
          action: "logout_all",
          success: true,
          message: `Expired ${result.count} session(s) for user ${user.id}.`,
          resource_type: "user",
          resource_id: user.id,
          created_at: nowISO,
          updated_at: nowISO,
        },
      });
    });
  } catch {
    throw new HttpException("Internal Server Error", 500);
  }
}
