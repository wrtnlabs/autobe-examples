import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
import { CommunityPlatformCommunityBannedUserAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityBannedUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdBannedUsersList(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.IRequest;
}): Promise<IPageICommunityPlatformCommunityBannedUser.ISummary> {
  const page = props.body.page !== undefined ? Math.max(props.body.page, 1) : 1;
  const limit =
    props.body.limit !== undefined
      ? Math.min(Math.max(props.body.limit, 1), 100)
      : 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.community_platform_community_banned_usersWhereInput =
    {
      community_id: props.communityId,
      deleted_at: null,
    };
  if (props.body.banStatus === "banned") {
    whereConditions.unbanned_at = null;
  } else if (props.body.banStatus === "unbanned") {
    whereConditions.unbanned_at = { not: null };
  }
  if (props.body.bannedAt !== undefined && props.body.bannedAt !== null) {
    whereConditions.banned_at = {
      gte: props.body.bannedAt,
    };
  }
  if (props.body.unbannedAt !== undefined && props.body.unbannedAt !== null) {
    whereConditions.unbanned_at = {
      gte: props.body.unbannedAt,
    };
  }
  if (props.body.search !== undefined && props.body.search.trim() !== "") {
    const search = props.body.search.trim();
    whereConditions.OR = [
      { ban_reason: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { display_name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }
  const dataRaw =
    await MyGlobal.prisma.community_platform_community_banned_users.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
      ...CommunityPlatformCommunityBannedUserAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_community_banned_users.count({
      where: whereConditions,
    });
  const data = await Promise.all(
    dataRaw.map((item) =>
      CommunityPlatformCommunityBannedUserAtSummaryTransformer.transform(item),
    ),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
