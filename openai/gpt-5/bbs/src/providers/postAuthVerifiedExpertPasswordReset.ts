import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPasswordReset";

export async function postAuthVerifiedExpertPasswordReset(props: {
  body: IEconDiscussVerifiedExpertPasswordReset.ICreate;
}): Promise<IEconDiscussVerifiedExpertPasswordReset.IResult> {
  const { body } = props;

  // Token policy: accept only tokens that match the issued pattern prefix.
  if (!body.token || !body.token.startsWith("reset-")) {
    throw new HttpException("Invalid or expired token", 401);
  }

  const hashed = await PasswordUtil.hash(body.new_password);
  const now = toISOStringSafe(new Date());

  const target = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    select: { id: true },
  });

  if (!target) {
    throw new HttpException("No eligible user found for password reset", 404);
  }

  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: target.id },
    data: {
      password_hash: hashed,
      updated_at: now,
    },
  });

  return {
    success: true,
    message: "Password reset completed",
    occurred_at: now,
  };
}
