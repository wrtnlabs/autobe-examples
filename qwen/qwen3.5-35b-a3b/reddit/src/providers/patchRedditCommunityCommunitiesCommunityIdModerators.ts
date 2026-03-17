import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filter conditions
  const whereInput: Prisma.reddit_community_moderatorsWhereInput = {
    reddit_community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      moderator: {
        username: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.added_by_username !== undefined && {
      addedBy: {
        username: {
          contains: props.body.added_by_username,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.reddit_community_moderatorsWhereInput;
  // Build order by with default sort by created_at desc
  const orderByInput: Prisma.reddit_community_moderatorsOrderByWithRelationInput[] =
    [
      props.body.sort === "username"
        ? {
            moderator: {
              username: (props.body.order ?? "desc") as "asc" | "desc",
            },
          }
        : { created_at: (props.body.order ?? "desc") as "asc" | "desc" },
    ];
  // Query moderators with pagination
  const data = await MyGlobal.prisma.reddit_community_moderators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityModeratorAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_moderators.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityModeratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
