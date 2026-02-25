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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditCommunityProfiles(props: {
  body: IRedditCommunityMember.IRequest;
}): Promise<IPageIRedditCommunityMember.ISummary> {
  const {
    search,
    karma_min,
    karma_max,
    sort = "karma",
    page = 1,
    limit = 20,
  } = props.body;
  // Validate pagination bounds
  const validatedPage = Math.max(1, page);
  const validatedLimit = Math.min(Math.max(1, limit), 100);
  const skip = (validatedPage - 1) * validatedLimit;
  // Build search condition: case-insensitive fuzzy match on display_name, username, bio
  const where: Prisma.reddit_community_membersWhereInput = {
    AND: [
      search
        ? {
            OR: [
              { display_name: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { bio: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      karma_min !== undefined ? { karma_score: { gte: karma_min } } : {},
      karma_max !== undefined ? { karma_score: { lte: karma_max } } : {},
    ],
  };
  // Fetch total count for pagination
  const total = await MyGlobal.prisma.reddit_community_members.count({ where });
  // Fetch paginated results with only needed fields
  const data = await MyGlobal.prisma.reddit_community_members.findMany({
    where,
    skip,
    take: validatedLimit,
    orderBy:
      sort === "karma" ? { karma_score: "desc" } : { created_at: "desc" },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
    },
  });
  // Transform data to ISummary format: convert Date to ISO string
  const transformedData = data.map(
    (member) =>
      ({
        id: member.id,
        username: member.username,
        display_name: member.display_name,
        bio: member.bio,
        avatar_url: member.avatar_url,
        karma_score: member.karma_score,
        created_at: member.created_at.toISOString(),
      }) satisfies IRedditCommunityMember.ISummary,
  );
  // Return paginated summary
  return {
    data: transformedData,
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    },
  };
}
