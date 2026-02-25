import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditCommunityMemberCommunitiesSearch(props: {
  member: MemberPayload;
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity> {
  const search = props.body.search?.trim();
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  if (search === undefined || search.length < 2) {
    throw new HttpException("SEARCH_TERM_TOO_SHORT", 400);
  }
  const offset = (page - 1) * limit;
  // Raw SQL query with safe parametrization for relevance and subscriber_count sorting
  const sql = `
    SELECT 
      c.id,
      c.name,
      c.description,
      c.icon_url,
      c.created_at,
      c.updated_at,
      m.id AS owner_id,
      m.username AS owner_username,
      m.display_name AS owner_display_name,
      m.bio AS owner_bio,
      m.avatar_url AS owner_avatar_url,
      m.karma_score AS owner_karma_score,
      m.created_at AS owner_created_at,
      (
        SELECT COUNT(*)
        FROM reddit_community_subscriptions s
        WHERE s.community_id = c.id
      ) AS subscriber_count,
      (
        CASE 
          WHEN c.name ILIKE $1 || '%' THEN 3 
          WHEN c.name ILIKE '%' || $1 || '%' THEN 2 
          WHEN c.description ILIKE '%' || $1 || '%' THEN 1 
          ELSE 0 
        END
      ) AS relevance
    FROM reddit_community_communities c
    JOIN reddit_community_members m ON m.id = c.owner_user_id
    WHERE c.name ILIKE '%' || $1 || '%' OR c.description ILIKE '%' || $1 || '%'
    ORDER BY relevance DESC, subscriber_count DESC
    LIMIT $2 OFFSET $3
  `;
  // Execute raw query
  const data: any[] = await MyGlobal.prisma.$queryRawUnsafe(
    sql,
    search,
    limit,
    offset,
  );
  // Count total matching records
  const total = await MyGlobal.prisma.reddit_community_communities.count({
    where: {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    },
  });
  // Manually construct IRedditCommunityCommunity objects
  const transformedData = data.map((row) => {
    const owner: IRedditCommunityMember.ISummary = {
      id: row.owner_id,
      username: row.owner_username,
      display_name: row.owner_display_name,
      bio: row.owner_bio,
      avatar_url: row.owner_avatar_url,
      karma_score: row.owner_karma_score,
      created_at: toISOStringSafe(row.owner_created_at),
    } satisfies IRedditCommunityMember.ISummary;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon_url: row.icon_url,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      owner,
      subscriber_count: row.subscriber_count,
    } satisfies IRedditCommunityCommunity;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
