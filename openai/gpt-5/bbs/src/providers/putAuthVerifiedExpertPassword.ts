import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";
import { VerifiedexpertPayload } from "../decorators/payload/VerifiedexpertPayload";

export async function putAuthVerifiedExpertPassword(props: {
  verifiedExpert: VerifiedexpertPayload;
  body: IEconDiscussVerifiedExpertPassword.IUpdate;
}): Promise<void> {
  const { verifiedExpert, body } = props;

  // 1) Load user and ensure active (not soft-deleted)
  const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { id: verifiedExpert.id },
    select: {
      id: true,
      password_hash: true,
      deleted_at: true,
    },
  });
  if (!user) {
    throw new HttpException("Not Found", 404);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Forbidden: Account is deactivated", 403);
  }

  // 2) Verify current password
  const valid = await PasswordUtil.verify(
    body.current_password,
    user.password_hash,
  );
  if (!valid) {
    throw new HttpException("Bad Request: current password is incorrect", 400);
  }

  // 3) Hash new password and update
  const newHash = await PasswordUtil.hash(body.new_password);
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: user.id },
    data: {
      password_hash: newHash,
      updated_at: now,
    },
  });
}
