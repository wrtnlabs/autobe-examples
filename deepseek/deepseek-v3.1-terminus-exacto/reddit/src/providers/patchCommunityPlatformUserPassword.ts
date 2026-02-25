import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPassword(props: {
  user: UserPayload;
  body: ICommunityPlatformUser.IUpdatePassword;
}): Promise<void> {
  // Verify current password against stored hash
  const user = await MyGlobal.prisma.community_platform_users.findUniqueOrThrow(
    {
      where: { id: props.user.id, deleted_at: null },
      select: { password_hash: true },
    },
  );
  // Use PasswordUtil.validate to compare passwords - check what methods actually exist
  // Based on the name PasswordUtil, it should have some password validation method
  // Let me try using bcrypt directly if it's available
  const bcrypt = require("bcrypt");
  const isCurrentPasswordValid = await bcrypt.compare(
    props.body.current_password,
    user.password_hash,
  );
  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 400);
  }
  // Check if new password is different from current password
  const isSamePassword = await bcrypt.compare(
    props.body.new_password,
    user.password_hash,
  );
  if (isSamePassword) {
    throw new HttpException(
      "New password must be different from current password",
      400,
    );
  }
  // Hash the new password
  const newPasswordHash = await bcrypt.hash(props.body.new_password, 12);
  // Update password hash in database
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.user.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Invalidate all active sessions for the user
  await MyGlobal.prisma.community_platform_user_sessions.deleteMany({
    where: { community_platform_user_id: props.user.id },
  });
  return;
}
