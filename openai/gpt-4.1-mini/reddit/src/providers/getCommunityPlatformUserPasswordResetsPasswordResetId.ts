import { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
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

export async function getCommunityPlatformUserPasswordResetsPasswordResetId(props: {
  user: UserPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserPasswordReset> {
  const record =
    await MyGlobal.prisma.community_platform_user_password_resets.findUnique({
      where: { id: props.passwordResetId },
    });
  if (!record) {
    throw new HttpException("Password reset not found", 404);
  }
  return {
    id: record.id,
    community_platform_user_id: record.community_platform_user_id,
    token: record.token,
    expires_at: toISOStringSafe(record.expires_at),
    used: record.used,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
