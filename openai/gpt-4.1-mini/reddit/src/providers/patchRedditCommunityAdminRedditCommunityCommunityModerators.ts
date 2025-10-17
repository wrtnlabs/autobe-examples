import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerators";
import { IPageIRedditCommunityCommunityModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerators";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityCommunityModerators(props: {
  admin: AdminPayload;
  body: IRedditCommunityCommunityModerators.IRequest;
}): Promise<IPageIRedditCommunityCommunityModerators.ISummary> {
  const { body } = props;

  const page = body.page === undefined || body.page === null ? 1 : body.page;
  const limit =
    body.limit === undefined || body.limit === null ? 100 : body.limit;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.memberId !== undefined &&
      body.memberId !== null && { member_id: body.memberId }),
    ...(body.communityId !== undefined &&
      body.communityId !== null && { community_id: body.communityId }),
    ...((body.assignedAfter !== undefined && body.assignedAfter !== null) ||
    (body.assignedBefore !== undefined && body.assignedBefore !== null)
      ? {
          assigned_at: {
            ...(body.assignedAfter !== undefined && body.assignedAfter !== null
              ? { gte: body.assignedAfter }
              : {}),
            ...(body.assignedBefore !== undefined &&
            body.assignedBefore !== null
              ? { lte: body.assignedBefore }
              : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_moderators.findMany({
      where,
      orderBy: { assigned_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        member_id: true,
        community_id: true,
        assigned_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_community_moderators.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      member_id: item.member_id,
      community_id: item.community_id,
      assigned_at: toISOStringSafe(item.assigned_at),
    })),
  };
}
