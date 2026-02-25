import { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentModeration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentModerationAtSummaryTransformer } from "../transformers/CommunityPlatformCommentModerationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdCommentsCommentIdModerations(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentModeration.IRequest;
}): Promise<IPageICommunityPlatformCommentModeration.ISummary> {
  // Validate comment exists and belongs to post
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, community_platform_post_id: true },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Build WHERE clause with filters
  const whereInput: Prisma.community_platform_comment_moderationsWhereInput = {
    comment_id: props.commentId,
  };
  // Apply optional filters
  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    whereInput.status = props.body.status;
  }
  if (
    props.body.moderator_id !== undefined &&
    props.body.moderator_id !== null
  ) {
    whereInput.moderator_id = props.body.moderator_id;
  }
  if (props.body.reason !== undefined && props.body.reason !== null) {
    whereInput.reason = { contains: props.body.reason };
  }
  // Date range filters - fix spread operator issue
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    const base = whereInput.created_at || {};
    whereInput.created_at = Object.assign({}, base, {
      gte: new Date(props.body.created_at_from),
    });
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    const base = whereInput.created_at || {};
    whereInput.created_at = Object.assign({}, base, {
      lte: new Date(props.body.created_at_to),
    });
  }
  if (
    props.body.updated_at_from !== undefined &&
    props.body.updated_at_from !== null
  ) {
    const base = whereInput.updated_at || {};
    whereInput.updated_at = Object.assign({}, base, {
      gte: new Date(props.body.updated_at_from),
    });
  }
  if (
    props.body.updated_at_to !== undefined &&
    props.body.updated_at_to !== null
  ) {
    const base = whereInput.updated_at || {};
    whereInput.updated_at = Object.assign({}, base, {
      lte: new Date(props.body.updated_at_to),
    });
  }
  if (
    props.body.expired_at_from !== undefined &&
    props.body.expired_at_from !== null
  ) {
    const base = whereInput.expired_at || {};
    whereInput.expired_at = Object.assign({}, base, {
      gte: new Date(props.body.expired_at_from),
    });
  }
  if (
    props.body.expired_at_to !== undefined &&
    props.body.expired_at_to !== null
  ) {
    const base = whereInput.expired_at || {};
    whereInput.expired_at = Object.assign({}, base, {
      lte: new Date(props.body.expired_at_to),
    });
  }
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Sorting
  const orderByInput: Prisma.community_platform_comment_moderationsOrderByWithRelationInput =
    {};
  if (props.body.sort === "created_at") {
    orderByInput.created_at = props.body.sort_direction ?? "desc";
  } else if (props.body.sort === "updated_at") {
    orderByInput.updated_at = props.body.sort_direction ?? "desc";
  } else {
    orderByInput.created_at = "desc";
  }
  // Get data with pagination
  const data =
    await MyGlobal.prisma.community_platform_comment_moderations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformCommentModerationAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_comment_moderations.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommentModerationAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
