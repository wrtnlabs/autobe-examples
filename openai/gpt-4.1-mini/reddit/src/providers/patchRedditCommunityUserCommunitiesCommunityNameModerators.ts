import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchRedditCommunityUserCommunitiesCommunityNameModerators(props: {
  user: UserPayload;
  communityName: string;
  body: IRedditCommunityCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityCommunityModerator.ISummary> {
  const { communityName, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community not found: ${communityName}`, 404);
  }

  const whereConditions = {
    reddit_community_community_id: community.id,
    ...(body.filter?.moderator_id !== undefined &&
      body.filter?.moderator_id !== null && {
        reddit_community_moderator_id: body.filter.moderator_id,
      }),
    ...(body.filter?.assigned_after !== undefined &&
      body.filter?.assigned_after !== null && {
        assigned_at: {
          gte: body.filter.assigned_after,
        },
      }),
    ...(body.filter?.assigned_before !== undefined &&
      body.filter?.assigned_before !== null && {
        assigned_at: {
          lte: body.filter.assigned_before,
        },
      }),
  };

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const sortField = body.sort_by ?? "assigned_at";
  const orderDirection = body.order ?? "desc";

  const total =
    await MyGlobal.prisma.reddit_community_community_moderators.count({
      where: whereConditions,
    });

  const moderators =
    await MyGlobal.prisma.reddit_community_community_moderators.findMany({
      where: whereConditions,
      orderBy: { [sortField]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        assigned_at: true,
        reddit_community_moderator_id: true,
      },
    });

  const data = moderators.map(
    (mod): IRedditCommunityCommunityModerator.ISummary => ({
      id: mod.id,
      user_id: mod.reddit_community_moderator_id,
      created_at: toISOStringSafe(mod.assigned_at),
      user_email: "",
      user_created_at: "",
    }),
  );

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
