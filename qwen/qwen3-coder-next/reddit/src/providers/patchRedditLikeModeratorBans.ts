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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeBanAtSummaryTransformer } from "../transformers/RedditLikeBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorBans(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeBan.IRequest;
}): Promise<IPageIRedditLikeBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_like_bansWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.reddit_like_user_id !== undefined && {
      bannedUser: { id: props.body.reddit_like_user_id },
    }),
    ...(props.body.reddit_like_community_id !== undefined && {
      bannedCommunity: { id: props.body.reddit_like_community_id },
    }),
  } satisfies Prisma.reddit_like_bansWhereInput;
  const orderByInput = (
    props.body.sort === "-created_at"
      ? { created_at: "desc" as const }
      : props.body.sort === "-updated_at"
        ? { updated_at: "desc" as const }
        : props.body.sort === "created_at"
          ? { created_at: "asc" as const }
          : props.body.sort === "updated_at"
            ? { updated_at: "asc" as const }
            : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_like_bansOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_like_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_bans.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
