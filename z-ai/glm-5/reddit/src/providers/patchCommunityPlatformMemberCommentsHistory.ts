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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommentsHistory(props: {
  member: MemberPayload;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Determine sort order
  const sort = props.body.sort ?? "new";
  let orderBy: Prisma.community_platform_commentsOrderByWithRelationInput[];
  if (sort === "best") {
    orderBy = [{ score: "desc" as const }, { created_at: "desc" as const }];
  } else if (sort === "new") {
    orderBy = [{ created_at: "desc" as const }];
  } else {
    // controversial: high engagement relative to vote count
    orderBy = [{ score: "desc" as const }, { created_at: "desc" as const }];
  }
  // Build where clause - filter by authorId if provided
  const whereInput = {
    deleted_at: null,
    ...(props.body.authorId !== null && props.body.authorId !== undefined
      ? { author_id: props.body.authorId }
      : { author_id: props.member.id }),
  } satisfies Prisma.community_platform_commentsWhereInput;
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    comments,
    CommunityPlatformCommentAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
