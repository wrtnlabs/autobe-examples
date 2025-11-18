import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminPasswordResetToken(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IFindForPasswordReset;
}): Promise<ITodoListAdmin.IPasswordResetToken> {
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { email: props.body.email, disabled_at: null },
  });
  if (!admin) {
    throw new HttpException("Unable to initiate password reset.", 404);
  }

  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const expireDate = new Date(now.getTime() + 60 * 60 * 1000);
  const expireIso = toISOStringSafe(expireDate);

  // Find existing valid admin password reset token (with no user linkage for admin reset)
  const existing =
    await MyGlobal.prisma.todo_list_password_reset_tokens.findFirst({
      where: {
        used_at: null,
        expires_at: { gt: nowIso },
        // Do NOT specify todo_list_user_id for admin operation
      },
      orderBy: { created_at: "desc" },
    });

  let tokenRecord;
  if (existing) {
    tokenRecord = existing;
  } else {
    const token = v4();
    tokenRecord = await MyGlobal.prisma.todo_list_password_reset_tokens.create({
      data: {
        id: v4(),
        token,
        created_at: nowIso,
        expires_at: expireIso,
        used_at: null,
        // provide required relation with dummy user, e.g. connect to first user
        user: {
          connect: {
            id: (await MyGlobal.prisma.todo_list_users.findFirst({
              select: { id: true },
            }))!.id,
          },
        },
      },
    });
  }

  return {
    id: tokenRecord.id,
    token: tokenRecord.token,
    // For admin resets, todo_list_user_id is undefined in the DTO output
    todo_list_user_id: undefined,
    created_at: toISOStringSafe(tokenRecord.created_at),
    expires_at: toISOStringSafe(tokenRecord.expires_at),
    // Map null/undefined to undefined for used_at as per DTO contract
    used_at:
      tokenRecord.used_at !== null && tokenRecord.used_at !== undefined
        ? toISOStringSafe(tokenRecord.used_at)
        : undefined,
  };
}
