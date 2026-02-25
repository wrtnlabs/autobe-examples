import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityOwner";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityCommunityOwnerAtSummaryTransformer } from "../transformers/RedditCommunityCommunityOwnerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminCommunityOwners(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityCommunityOwner.IRequest;
}): Promise<IPageIRedditCommunityCommunityOwner.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_community_community_ownersWhereInput = {
    is_deleted: props.body.isDeleted,
    username: props.body.username
      ? { contains: props.body.username, mode: "insensitive" }
      : undefined,
    karma_score: {
      gte: props.body.minKarmaScore,
      lte: props.body.maxKarmaScore,
    },
  } satisfies Prisma.reddit_community_community_ownersWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_owners.findMany({
      skip,
      take: limit,
      where,
      orderBy: { created_at: "desc" },
      ...RedditCommunityCommunityOwnerAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_community_owners.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommunityOwnerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
