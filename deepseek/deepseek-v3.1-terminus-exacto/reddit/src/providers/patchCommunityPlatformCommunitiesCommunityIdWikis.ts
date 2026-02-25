import { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityWiki";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityWikiAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityWikiAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformCommunitiesCommunityIdWikis(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityWiki.IRequest;
}): Promise<IPageICommunityPlatformCommunityWiki.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput: Prisma.community_platform_community_wikisWhereInput = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
  };
  // Apply text search filter if provided
  if (props.body.search) {
    whereInput.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Apply status filter if provided
  if (props.body.status) {
    whereInput.status = props.body.status;
  }
  // Apply date range filters using ISO string comparison
  if (props.body.created_from || props.body.created_to) {
    whereInput.created_at = {};
    if (props.body.created_from) {
      whereInput.created_at.gte = props.body.created_from;
    }
    if (props.body.created_to) {
      whereInput.created_at.lte = props.body.created_to;
    }
  }
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_wikis.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommunityWikiAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_community_wikis.count({
      where: whereInput,
    }),
  ]);
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityWikiAtSummaryTransformer.transform,
  );
  // Calculate pagination with edge case handling
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
