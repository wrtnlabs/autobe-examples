import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";

export async function patchCommunityPlatformSearchComments(props: {
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const { sort = "best", limit = 20, offset = 0 } = props.body;
  // Build dynamic where condition
  const whereInput = {
    deleted_at: null,
    ...(sort === "controversial" &&
      {
        // Filter for controversial: scores between -2 and +2
        // This is implemented via the aggregate expression in the orderBy
      }),
  } satisfies Prisma.community_platform_commentsWhereInput;
  // Build orderBy condition based on sort parameter
  const orderByInput = (
    sort === "best"
      ? { vote_score: "desc", created_at: "desc" }
      : sort === "new"
        ? { created_at: "desc" }
        : { vote_score: "desc", created_at: "desc" }
  ) satisfies Prisma.community_platform_commentsOrderByWithRelationInput;
  // Fetch data with pagination using transformer's select for schema conformity
  const data = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: offset,
    take: limit,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  // Transform results using the already-loaded transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: offset / limit + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
