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

export async function deleteCommunityPlatformAdminEmailVerificationsEmailVerificationId(props: {
  admin: AdminPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const verification =
    await MyGlobal.prisma.community_platform_admin_email_verifications.findUniqueOrThrow(
      {
        where: {
          id: props.emailVerificationId,
        },
        select: {
          id: true,
          community_platform_admin_id: true,
        },
      },
    );
  if (verification.community_platform_admin_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_admin_email_verifications.delete({
    where: {
      id: props.emailVerificationId,
    },
  });
}
