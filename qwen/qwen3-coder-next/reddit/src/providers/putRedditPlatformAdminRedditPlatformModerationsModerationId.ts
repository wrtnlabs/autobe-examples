import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
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

export async function putRedditPlatformAdminRedditPlatformModerationsModerationId(props: {
  admin: AdminPayload;
  moderationId: string;
  body: IRedditPlatformModeration.IUpdate;
}): Promise<IRedditPlatformModeration> {
  // Find existing moderation assignment
  const existing = await MyGlobal.prisma.reddit_platform_moderations.findUnique(
    {
      where: { id: props.moderationId },
    },
  );
  if (!existing) throw new HttpException("Moderation not found", 404);
  // Update the role field
  const updated = await MyGlobal.prisma.reddit_platform_moderations.update({
    where: { id: props.moderationId },
    data: {
      role: props.body.role,
    },
  });
  return {
    id: updated.id,
    community_id: updated.community_id,
    user_id: updated.user_id,
    role: updated.role as "OWNER" | "MODERATOR",
    created_at: toISOStringSafe(updated.created_at),
    community: {
      id: updated.community_id,
      name: "Loading...", // Will be replaced by transformer
      iconUrl: null,
      subscriberCount: 0,
    },
    user: {
      id: updated.user_id,
      username: "Loading...", // Will be replaced by transformer
    },
  };
}
