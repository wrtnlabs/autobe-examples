import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putAuthUserPassword(props: {
  user: UserPayload;
  body: ITodoUser.IUpdatePassword;
}): Promise<ITodoUser> {
  const { user, body } = props;

  const now = toISOStringSafe(new Date());

  const session = await MyGlobal.prisma.todo_user_sessions.findUnique({
    where: { id: user.session_id },
    select: { id: true, ip: true, href: true, referrer: true },
  });

  const existing = await MyGlobal.prisma.todo_users.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
    },
  });

  const verified = await PasswordUtil.verify(
    body.current_password,
    existing.password_hash,
  );
  if (!verified) {
    await MyGlobal.prisma.todo_audit_events.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_user_id: user.id,
        todo_user_session_id: user.session_id,
        actor_type: "user",
        category: "auth",
        action: "change_password",
        success: false,
        message: "Password change failed: invalid current password",
        ip: session?.ip ?? null,
        href: session?.href ?? null,
        referrer: session?.referrer ?? null,
        resource_type: "user",
        resource_id: user.id,
        created_at: now,
        updated_at: now,
      },
    });
    throw new HttpException("Forbidden", 403);
  }

  try {
    const newHash = await PasswordUtil.hash(body.new_password);
    const updated = await MyGlobal.prisma.todo_users.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        updated_at: now,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    });

    await MyGlobal.prisma.todo_audit_events.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_user_id: user.id,
        todo_user_session_id: user.session_id,
        actor_type: "user",
        category: "auth",
        action: "change_password",
        success: true,
        message: "Password changed successfully",
        ip: session?.ip ?? null,
        href: session?.href ?? null,
        referrer: session?.referrer ?? null,
        resource_type: "user",
        resource_id: user.id,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      email: updated.email as string & tags.Format<"email">,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  } catch {
    await MyGlobal.prisma.todo_audit_events.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_user_id: user.id,
        todo_user_session_id: user.session_id,
        actor_type: "user",
        category: "auth",
        action: "change_password",
        success: false,
        message: "Password change failed: unexpected error",
        ip: session?.ip ?? null,
        href: session?.href ?? null,
        referrer: session?.referrer ?? null,
        resource_type: "user",
        resource_id: user.id,
        created_at: now,
        updated_at: now,
      },
    });
    throw new HttpException("Internal Server Error", 500);
  }
}
