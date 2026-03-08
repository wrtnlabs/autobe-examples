import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityModerator";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformCommunityModeratorAtSummaryTransformer } from "../transformers/RedditPlatformCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminCommunitiesCommunityIdModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.IRequest;
}): Promise<IPageIRedditPlatformCommunityModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const boundedLimit = Math.min(limit, 100);
  const skip = (page - 1) * boundedLimit;
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const whereInput: Prisma.reddit_platform_community_moderatorsWhereInput = {
    community_id: props.communityId,
    ...(props.body.user_id !== undefined && { user_id: props.body.user_id }),
  } satisfies Prisma.reddit_platform_community_moderatorsWhereInput;
  const orderByInput = (() => {
    if (props.body.sort_by === "user_id") {
      return props.body.sort_order === "DESC"
        ? { user_id: "desc" as const }
        : { user_id: "asc" as const };
    }
    if (props.body.sort_by === "id") {
      return props.body.sort_order === "DESC"
        ? { id: "desc" as const }
        : { id: "asc" as const };
    }
    return props.body.sort_order === "DESC"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const };
  })() satisfies Prisma.reddit_platform_community_moderatorsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: whereInput,
      skip,
      take: boundedLimit,
      orderBy: orderByInput,
      ...RedditPlatformCommunityModeratorAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_platform_community_moderators.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformCommunityModeratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: boundedLimit,
      records: total,
      pages: Math.ceil(total / boundedLimit),
    } satisfies IPage.IPagination,
  };
}
