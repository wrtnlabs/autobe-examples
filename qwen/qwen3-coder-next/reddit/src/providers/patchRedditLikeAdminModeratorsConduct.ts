import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
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

export async function patchRedditLikeAdminModeratorsConduct(props: {
  admin: AdminPayload;
  body: IRedditLikeModeratorRole.IRequest;
}): Promise<IPageIRedditLikeModeratorRole.IConduct> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_like_moderator_roles.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      user_id: true,
      community_id: true,
      role: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_like_moderator_roles.count({});
  const conductData = await ArrayUtil.asyncMap(data, async (role) => {
    const banCount = await MyGlobal.prisma.reddit_like_bans.count({
      where: {
        reddit_like_user_id: role.user_id,
        reddit_like_community_id: role.community_id,
      },
    });
    const reportStats = await MyGlobal.prisma.reddit_like_reports.aggregate({
      _count: true,
      where: {
        reporter_id: role.user_id,
      },
    });
    const handlingTimes = await MyGlobal.prisma.reddit_like_reports.findMany({
      where: {
        reporter_id: role.user_id,
        status: { not: "pending" },
      },
      select: {
        created_at: true,
        updated_at: true,
      },
    });
    const totalHandlingTime = handlingTimes.reduce((sum, report) => {
      const diff =
        new Date(report.updated_at).getTime() -
        new Date(report.created_at).getTime();
      return sum + diff / (1000 * 60);
    }, 0);
    const averageHandlingTime =
      handlingTimes.length > 0 ? totalHandlingTime / handlingTimes.length : 0;
    return {
      id: role.id as string & tags.Format<"uuid">,
      user: {
        id: role.user_id,
        entity_type: "community" as const,
        title: "",
        content: "",
        score: 0,
        created_at: toISOStringSafe(role.created_at),
        updated_at: toISOStringSafe(role.created_at),
        hit_count: 0,
      },
      community: {
        id: role.community_id,
        name: "",
        created_at: toISOStringSafe(role.created_at),
      },
      role: role.role as "owner" | "moderator",
      created_at: toISOStringSafe(role.created_at),
      ban_count: banCount as number & tags.Type<"int32"> & tags.Minimum<0>,
      report_count: reportStats._count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      average_handling_time_minutes: averageHandlingTime as number &
        tags.Minimum<0>,
    };
  });
  return {
    data: conductData,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
