import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommentSnapshots(props: {
  body: ICommunityPlatformCommentSnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommentSnapshot.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build dynamic where clause
  const whereInput = {
    ...(props.body.commentId && {
      community_platform_comment_id: props.body.commentId,
    }),
    ...(props.body.editorMemberId !== undefined && {
      community_platform_member_id: props.body.editorMemberId,
    }),
    ...(props.body.postId && { post_id: props.body.postId }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.createdStart && {
      created_at: { gte: new Date(props.body.createdStart) },
    }),
    ...(props.body.createdEnd && {
      created_at: { lte: new Date(props.body.createdEnd) },
    }),
    ...(props.body.bodySearch && {
      body: { contains: props.body.bodySearch, mode: "insensitive" as const },
    }),
  } satisfies Prisma.community_platform_comment_snapshotsWhereInput;
  // Handle sorting - map request sort to database column
  let orderBy: Prisma.community_platform_comment_snapshotsOrderByWithRelationInput;
  if (props.body.sort === "created_at") {
    orderBy = { created_at: "asc" };
  } else if (props.body.sort === "-created_at") {
    orderBy = { created_at: "desc" };
  } else if (props.body.sort === "comment_id") {
    orderBy = { community_platform_comment_id: "asc" };
  } else if (props.body.sort === "-comment_id") {
    orderBy = { community_platform_comment_id: "desc" };
  } else {
    orderBy = { created_at: "desc" };
  }
  // Query data using transformer
  const data =
    await MyGlobal.prisma.community_platform_comment_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy,
      ...CommunityPlatformCommentSnapshotAtSummaryTransformer.select(),
    });
  // Query total count
  const total =
    await MyGlobal.prisma.community_platform_comment_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommentSnapshotAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformed,
    pagination: {
      current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        page,
      ),
      limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(limit),
      records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        total,
      ),
      pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        Math.ceil(total / limit),
      ),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformCommentSnapshot.ISummary;
}
