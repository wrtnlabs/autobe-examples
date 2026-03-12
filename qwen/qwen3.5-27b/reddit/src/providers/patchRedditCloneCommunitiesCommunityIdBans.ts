import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBan";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneBanAtSummaryTransformer } from "../transformers/RedditCloneBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunitiesCommunityIdBans(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneBan.IRequest;
}): Promise<IPageIRedditCloneBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  if (props.body.status === "active") {
    whereInput.lifted_at = null;
  } else if (props.body.status === "lifted") {
    whereInput.lifted_at = { not: null };
  }
  const bannedAtFilter: any = {};
  if (props.body.from) {
    bannedAtFilter.gte = new Date(props.body.from);
  }
  if (props.body.to) {
    bannedAtFilter.lte = new Date(props.body.to);
  }
  if (Object.keys(bannedAtFilter).length > 0) {
    whereInput.banned_at = bannedAtFilter;
  }
  if (props.body.search) {
    whereInput.member = {
      deleted_at: null,
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  } else {
    whereInput.member = { deleted_at: null };
  }
  const orderByInput: Prisma.reddit_clone_bansOrderByWithRelationInput =
    (() => {
      const sortBy = props.body.sortBy ?? "created_at";
      const sortOrder = props.body.sortOrder ?? "desc";
      switch (sortBy) {
        case "created_at":
          return { created_at: sortOrder };
        case "banned_at":
          return { banned_at: sortOrder };
        case "lifted_at":
          return { lifted_at: sortOrder };
        default:
          return { created_at: sortOrder };
      }
    })();
  const data = await MyGlobal.prisma.reddit_clone_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_bans.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
