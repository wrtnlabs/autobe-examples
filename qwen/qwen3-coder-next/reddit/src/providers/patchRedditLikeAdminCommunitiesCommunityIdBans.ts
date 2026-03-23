import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeBan";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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

export async function patchRedditLikeAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string;
  body: IRedditLikeBan.IRequest;
}): Promise<IPageIRedditLikeBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_like_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
  } satisfies Prisma.reddit_like_bansWhereInput;
  const data = await MyGlobal.prisma.reddit_like_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      bannedUser: {
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
        },
      },
      bannedCommunity: {
        select: {
          name: true,
          icon_url: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_like_bans.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      status: record.status,
      created_at: record.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: record.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: record.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null,
      bannedUser: {
        id: record.bannedUser.id as string & tags.Format<"uuid">,
        username: record.bannedUser.username,
        display_name: record.bannedUser.display_name,
        bio: record.bannedUser.bio ?? undefined,
        avatar_url: record.bannedUser.avatar_url as
          | (string & tags.Format<"uri">)
          | undefined,
        karma_score: record.bannedUser.karma_score,
        created_at: record.bannedUser.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IRedditLikeMember.ISummary,
      bannedCommunity: {
        name: record.bannedCommunity.name,
        icon_url: record.bannedCommunity.icon_url,
        subscriber_count: 0,
      } satisfies IRedditLikeCommunity.ISummary,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditLikeBan.ISummary;
}
