import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminMembers(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityMember.IRequest;
}): Promise<IPageIRedditCommunityMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with optional filters
  const where: Prisma.reddit_community_membersWhereInput = {
    is_deleted: false,
    ...(props.body.search && {
      username: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.karma_min !== undefined && {
      karma_score: { gte: props.body.karma_min },
    }),
    ...(props.body.karma_max !== undefined && {
      karma_score: { lte: props.body.karma_max },
    }),
  };
  // Build ORDER BY clause
  const orderBy: Prisma.reddit_community_membersOrderByWithRelationInput =
    props.body.sort === "username"
      ? { username: "asc" as const }
      : props.body.sort === "karma"
        ? { karma_score: "desc" as const }
        : { created_at: "desc" as const };
  // Fetch data
  const data = await MyGlobal.prisma.reddit_community_members.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditCommunityMemberAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_community_members.count({
    where,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityMemberAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityMember.ISummary;
}
