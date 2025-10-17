import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditLikeAdminPlatformSuspensionsSuspensionId(props: {
  admin: AdminPayload;
  suspensionId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePlatformSuspension> {
  const { admin, suspensionId } = props;

  const suspension =
    await MyGlobal.prisma.reddit_like_platform_suspensions.findUniqueOrThrow({
      where: {
        id: suspensionId,
        deleted_at: null,
      },
    });

  return {
    id: suspension.id as string & tags.Format<"uuid">,
    suspended_member_id: suspension.suspended_member_id as string &
      tags.Format<"uuid">,
    suspension_reason_category: suspension.suspension_reason_category,
    suspension_reason_text: suspension.suspension_reason_text,
    is_permanent: suspension.is_permanent,
    expiration_date: suspension.expiration_date
      ? toISOStringSafe(suspension.expiration_date)
      : undefined,
    is_active: suspension.is_active,
    created_at: toISOStringSafe(suspension.created_at),
  };
}
