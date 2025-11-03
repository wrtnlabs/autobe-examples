import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserLogout(props: {
  user: UserPayload;
}): Promise<void> {
  const now = toISOStringSafe(new Date());

  const success = await MyGlobal.prisma.$transaction(async (tx) => {
    const result = await tx.todo_user_sessions.updateMany({
      where: {
        id: props.user.session_id,
        todo_user_id: props.user.id,
        expired_at: null,
      },
      data: {
        expired_at: now,
      },
    });

    const ok = result.count > 0;

    await tx.todo_audit_events.create({
      data: {
        id: v4(),
        todo_user_id: props.user.id,
        todo_user_session_id: props.user.session_id,
        actor_type: "user",
        category: "auth",
        action: "logout",
        success: ok,
        message: ok
          ? "User session terminated"
          : "Logout attempted but session already expired or not found",
        created_at: now,
        updated_at: now,
      },
    });

    return ok;
  });

  if (!success) {
    throw new HttpException(
      "Conflict: Session already terminated or not found",
      409,
    );
  }
}
