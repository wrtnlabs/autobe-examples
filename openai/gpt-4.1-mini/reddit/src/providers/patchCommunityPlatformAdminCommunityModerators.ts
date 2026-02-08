import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
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

export async function patchCommunityPlatformAdminCommunityModerators(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  const page: number = 1;
  const limit: number = 100;
  const skip: number = (page - 1) * limit;
  const moderators =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: { deleted_at: null },
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        community_id: true,
        role: true,
        communityModerator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            karma: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where: { deleted_at: null },
    });
  function toUUID(value: string): string & import("typia").tags.Format<"uuid"> {
    return value;
  }
  const data: ICommunityPlatformCommunityModerator.ISummary[] = moderators.map(
    (moderator) => ({
      id: toUUID(moderator.id),
      community_id: toUUID(moderator.community_id),
      role: moderator.role,
      moderator: {
        id: toUUID(moderator.communityModerator.id),
        username: moderator.communityModerator.username,
        display_name: moderator.communityModerator.display_name ?? null,
        karma: moderator.communityModerator.karma,
      },
    }),
  );
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
