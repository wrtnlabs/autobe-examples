import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBanCollector } from "../collectors/CommunityPlatformCommunityBanCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  const communityId = props.communityId;
  // Extract userId from body, must exist
  const userId = (props.body as any).userId;
  if (!userId) {
    throw new HttpException("userId is required in ban body", 400);
  }
  const ban = await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.community_platform_community_bans.findUnique({
      where: {
        community_id_user_id: {
          community_id: communityId,
          user_id: userId,
        },
      },
      select: { id: true }, // minimal select to check existence
    });
    if (existing) {
      throw new HttpException(
        "Ban already exists for this user in community",
        409,
      );
    }
    const data = await CommunityPlatformCommunityBanCollector.collect({
      body: props.body,
      community: { id: communityId },
      user: { id: userId },
    });
    const created = await prisma.community_platform_community_bans.create({
      data: data,
    });
    const record = await prisma.community_platform_community_bans.findUnique({
      where: { id: created.id },
    });
    if (!record) {
      throw new HttpException("Created ban record not found", 500);
    }
    // Map Date fields to string format & tags.Format<'date-time'>
    return {
      ...record,
      banned_at: record.banned_at.toISOString() as string &
        tags.Format<"date-time">,
      created_at: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: record.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: record.deleted_at
        ? (record.deleted_at.toISOString() as string & tags.Format<"date-time">)
        : null,
      unbanned_at: record.unbanned_at
        ? (record.unbanned_at.toISOString() as string &
            tags.Format<"date-time">)
        : null,
    };
  });
  return ban;
}
