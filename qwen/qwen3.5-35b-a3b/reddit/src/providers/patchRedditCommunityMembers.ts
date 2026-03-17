import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMembers(props: {
  body: IRedditCommunityMember.IRequest;
}): Promise<IPageIRedditCommunityMember.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // Build dynamic where clause
  const whereClause: Prisma.reddit_community_membersWhereInput = {
    deleted_at:
      props.body.status === "deleted"
        ? { not: null }
        : props.body.status === "active"
          ? null
          : undefined,
    ...(props.body.search && {
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.created_from && {
      created_at: { gte: new Date(props.body.created_from) },
    }),
    ...(props.body.created_to && {
      created_at: { lte: new Date(props.body.created_to) },
    }),
  };
  // Build orderBy with proper type
  const orderByClause: Prisma.reddit_community_membersOrderByWithRelationInput[] =
    props.body.sortBy === "username"
      ? [{ username: "asc" as const }]
      : [{ created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc" }];
  // Execute query with karma join only (profile is separate)
  const data = await MyGlobal.prisma.reddit_community_members.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByClause,
    select: {
      id: true,
      username: true,
      created_at: true,
      karma: {
        select: {
          current_score: true,
        },
      },
    },
  });
  // Execute count
  const total: number = await MyGlobal.prisma.reddit_community_members.count({
    where: whereClause,
  });
  // Transform to ISummary using RedditCommunityMemberAtSummaryTransformer
  const transformedData = await ArrayUtil.asyncMap(data, async (member) => {
    // Reuse the existing transformer for consistency
    const transformerInput = {
      id: member.id,
      username: member.username,
      created_at: member.created_at,
      karma: member.karma,
    };
    return {
      id: transformerInput.id,
      username: transformerInput.username,
      created_at: toISOStringSafe(transformerInput.created_at),
      profile: undefined, // Profile is separate, fetch on demand
      karma:
        transformerInput.karma?.current_score !== undefined
          ? Number(transformerInput.karma.current_score)
          : undefined,
    } satisfies IRedditCommunityMember.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages:
        total === 0
          ? 0
          : (Math.max(1, Math.ceil(total / limit)) as number &
              tags.Type<"int32"> &
              tags.Minimum<0>),
    } satisfies IPage.IPagination,
  };
}
