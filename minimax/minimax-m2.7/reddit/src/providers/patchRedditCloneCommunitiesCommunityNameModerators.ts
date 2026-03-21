import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCloneCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunitiesCommunityNameModerators(props: {
  communityName: string;
  body: IRedditCloneCommunityModerator.IRequest;
}): Promise<IPageIRedditCloneCommunityModerator.ISummary> {
  // Pagination setup with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Verify community exists (returns 404 if not found)
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { name: props.communityName },
  });
  // Build WHERE conditions dynamically
  const whereCondition = {
    community: {
      name: props.communityName,
    },
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(props.body.assignedAfter !== undefined && {
      created_at: { gt: new Date(props.body.assignedAfter) },
    }),
    ...(props.body.assignedBefore !== undefined && {
      created_at: { lt: new Date(props.body.assignedBefore) },
    }),
    ...(props.body.searchMember !== undefined && {
      member: {
        username: {
          contains: props.body.searchMember,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.reddit_clone_community_moderatorsWhereInput;
  // Build ORDER BY conditions
  const orderByInput = (
    props.body.sort === "role"
      ? { role: props.body.order ?? ("asc" as const) }
      : { created_at: props.body.order ?? ("desc" as const) }
  ) satisfies Prisma.reddit_clone_community_moderatorsOrderByWithRelationInput;
  // Execute findMany with transformer select
  const moderators =
    await MyGlobal.prisma.reddit_clone_community_moderators.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneCommunityModeratorAtSummaryTransformer.select(),
    });
  // Execute count for pagination
  const total = await MyGlobal.prisma.reddit_clone_community_moderators.count({
    where: whereCondition,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    moderators,
    RedditCloneCommunityModeratorAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
