import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
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

export async function getCommunityPlatformModeratorCommunitiesCommunityIdBannedUsers(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformCommunityBannedUser.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const bannedUsers =
    await MyGlobal.prisma.community_platform_community_banned_users.findMany({
      where: { community_id: props.communityId, deleted_at: null },
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.community_platform_community_banned_users.count({
      where: { community_id: props.communityId, deleted_at: null },
    });
  const data = bannedUsers.map((record) => {
    const bannedAt = record.banned_at.toISOString();
    const unbannedAt = record.unbanned_at
      ? record.unbanned_at.toISOString()
      : null;
    const createdAt = record.created_at.toISOString();
    const updatedAt = record.updated_at.toISOString();
    const deletedAt = record.deleted_at
      ? record.deleted_at.toISOString()
      : null;
    return {
      id: record.id,
      community_id: record.community_id,
      user_id: record.user_id,
      banned_at: bannedAt as unknown as string & tags.Format<"date-time">,
      unbanned_at: unbannedAt as unknown as
        | (string & tags.Format<"date-time">)
        | null,
      ban_reason: record.ban_reason,
      created_at: createdAt as unknown as string & tags.Format<"date-time">,
      updated_at: updatedAt as unknown as string & tags.Format<"date-time">,
      deleted_at: deletedAt as unknown as
        | (string & tags.Format<"date-time">)
        | null,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
