import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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
import { CommunityCommentAtSummaryTransformer } from "../transformers/CommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityUserProfilesUserProfileIdComments(props: {
  userProfileId: string & tags.Format<"uuid">;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  // Step 1: Resolve user profile to get community_member_id (404 if not found)
  const profile =
    await MyGlobal.prisma.community_user_profiles.findUniqueOrThrow({
      where: { id: props.userProfileId },
      select: { community_member_id: true },
    });
  // Step 2: Build pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 3: Build date range filter (combine gte/lte into single created_at object)
  const createdAtFilter: Prisma.community_commentsWhereInput =
    props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          created_at: {
            ...(props.body.createdAtFrom != null && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo != null && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {};
  // Step 4: Build parentId filter
  // undefined = no filter on parent_id
  // null = top-level comments only (WHERE parent_id IS NULL)
  // UUID string = replies to that specific comment (WHERE parent_id = UUID)
  const parentIdFilter: Prisma.community_commentsWhereInput =
    props.body.parentId === undefined
      ? {}
      : props.body.parentId === null
        ? { parent_id: null }
        : { parent_id: props.body.parentId };
  // Step 5: Build WHERE clause
  const whereInput = {
    member_id: profile.community_member_id,
    deleted_at: null,
    ...(props.body.keyword != null && {
      content: { contains: props.body.keyword, mode: "insensitive" as const },
    }),
    ...parentIdFilter,
    ...(props.body.postId != null && { post_id: props.body.postId }),
    ...createdAtFilter,
  } satisfies Prisma.community_commentsWhereInput;
  // Step 6: Build ORDER BY
  const sort = props.body.sort ?? "created_at_desc";
  const orderByInput: Prisma.community_commentsOrderByWithRelationInput[] =
    sort === "best"
      ? [
          { votes: { _count: "desc" as const } },
          { created_at: "desc" as const },
        ]
      : sort === "controversial"
        ? [
            { votes: { _count: "desc" as const } },
            { created_at: "asc" as const },
          ]
        : sort === "created_at_asc"
          ? [{ created_at: "asc" as const }]
          : [{ created_at: "desc" as const }];
  // Step 7: Execute queries sequentially
  const data = await MyGlobal.prisma.community_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_comments.count({
    where: whereInput,
  });
  // Step 8: Transform and return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityCommentAtSummaryTransformer.transform,
    ),
  };
}
