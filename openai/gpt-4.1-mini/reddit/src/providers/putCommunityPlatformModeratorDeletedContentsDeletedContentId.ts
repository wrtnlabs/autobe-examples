import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorDeletedContentsDeletedContentId(props: {
  moderator: ModeratorPayload;
  deletedContentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformDeletedContent.IUpdate;
}): Promise<ICommunityPlatformDeletedContent> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const existing =
    await MyGlobal.prisma.community_platform_deleted_contents.findUnique({
      where: { id: props.deletedContentId },
    });
  if (!existing) throw new HttpException("Deleted content not found", 404);
  const updated =
    await MyGlobal.prisma.community_platform_deleted_contents.update({
      where: { id: props.deletedContentId },
      data: { updated_at: now },
    });
  return {
    id: updated.id,
    moderator_id: updated.moderator_id,
    user_id: updated.user_id,
    post_id: updated.post_id === null ? undefined : updated.post_id,
    comment_id: updated.comment_id === null ? undefined : updated.comment_id,
    reason: updated.reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
