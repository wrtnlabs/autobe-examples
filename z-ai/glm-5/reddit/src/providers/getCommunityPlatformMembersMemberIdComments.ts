import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMembersMemberIdComments(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // Verify member exists and is not soft-deleted
  await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause for comments by this member, excluding soft-deleted
  const whereInput = {
    author_id: props.memberId,
    deleted_at: null,
  } satisfies Prisma.community_platform_commentsWhereInput;
  // Query comments with pagination
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  // Count total comments for pagination metadata
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  // Transform results using the summary transformer
  const data = await ArrayUtil.asyncMap(
    comments,
    CommunityPlatformCommentAtSummaryTransformer.transform,
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
