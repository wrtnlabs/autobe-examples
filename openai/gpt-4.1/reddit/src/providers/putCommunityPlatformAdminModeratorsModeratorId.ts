import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminModeratorsModeratorId(props: {
  admin: AdminPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerator.IUpdate;
}): Promise<ICommunityPlatformModerator> {
  const now = toISOStringSafe(new Date());
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: { id: props.moderatorId, deleted_at: null },
    });
  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }
  const updated = await MyGlobal.prisma.community_platform_moderators.update({
    where: { id: props.moderatorId },
    data: {
      email: props.body.email ?? undefined,
      status: props.body.status ?? undefined,
      deleted_at:
        props.body.deleted_at === undefined ? undefined : props.body.deleted_at,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    member_id: updated.member_id,
    community_id: updated.community_id,
    email: updated.email,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
