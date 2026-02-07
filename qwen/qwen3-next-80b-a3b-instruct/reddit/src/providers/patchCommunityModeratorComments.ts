import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityModeratorComments(props: {
  moderator: ModeratorPayload;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  // Create filtered criteria based on available IRequest properties
  // Since IRequest doesn't have page, limit, status, etc., we'll use default values
  // and ensure compatibility with Prisma types
  const whereInput: Prisma.community_commentsWhereInput = {
    deleted_at: null,
  };
  // Build orderBy based on available sort options
  const orderByInput: Prisma.community_commentsOrderByWithRelationInput = {
    created_at: "desc" as const,
  };
  // Query with pagination
  const data = await MyGlobal.prisma.community_comments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityCommentTransformer.select(),
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.community_comments.count({
    where: whereInput,
  });
  // Transform data using existing transformer
  const transformedData = data.map(CommunityCommentTransformer.transform);
  // Construct IPageICommunityComment.ISummary
  return {
    data: transformedData as ICommunityComment.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
