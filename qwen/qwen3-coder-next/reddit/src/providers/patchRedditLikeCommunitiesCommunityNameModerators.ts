import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeModeratorRoleAtSummaryTransformer } from "../transformers/RedditLikeModeratorRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunitiesCommunityNameModerators(props: {
  communityName: string;
  body: IRedditLikeModeratorRole.IRequest;
}): Promise<IPageIRedditLikeModeratorRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Count total moderators for this community
  const total = await MyGlobal.prisma.reddit_like_moderator_roles.count({
    where: {
      community: {
        name: props.communityName,
      },
    },
  });
  // Fetch paginated moderators
  const moderators = await MyGlobal.prisma.reddit_like_moderator_roles.findMany(
    {
      where: {
        community: {
          name: props.communityName,
        },
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...RedditLikeModeratorRoleAtSummaryTransformer.select(),
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      moderators,
      RedditLikeModeratorRoleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
