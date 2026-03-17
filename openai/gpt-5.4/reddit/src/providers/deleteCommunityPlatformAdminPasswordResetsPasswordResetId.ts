import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminPasswordResetsPasswordResetId(props: {
  admin: AdminPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const passwordReset =
    await MyGlobal.prisma.community_platform_member_password_resets.findUniqueOrThrow(
      {
        where: { id: props.passwordResetId },
        select: {
          id: true,
          community_platform_member_id: true,
        },
      },
    );
  if (passwordReset.community_platform_member_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_member_password_resets.delete({
    where: { id: props.passwordResetId },
  });
}
