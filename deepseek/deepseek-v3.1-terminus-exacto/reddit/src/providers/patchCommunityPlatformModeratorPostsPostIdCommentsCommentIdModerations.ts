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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentModerationAtSummaryTransformer } from "../transformers/CommunityPlatformCommentModerationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorPostsPostIdCommentsCommentIdModerations(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentModeration.IRequest;
}): Promise<IPageICommunityPlatformCommentModeration.ISummary> {
  // Validate comment-post relationship exists
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to specified post", 400);
  }
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions based on request filters
  const whereInput: Prisma.community_platform_comment_moderationsWhereInput = {
    comment_id: props.commentId,
    ...(props.body.action_type !== undefined &&
      props.body.action_type !== null && {
        action_type: props.body.action_type,
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(props.body.moderator_id !== undefined &&
      props.body.moderator_id !== null && {
        moderator_id: props.body.moderator_id,
      }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null && {
        created_at: { gte: props.body.created_at_from },
      }),
    ...(props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null && {
        created_at: { lte: props.body.created_at_to },
      }),
    ...(props.body.updated_at_from !== undefined &&
      props.body.updated_at_from !== null && {
        updated_at: { gte: props.body.updated_at_from },
      }),
    ...(props.body.updated_at_to !== undefined &&
      props.body.updated_at_to !== null && {
        updated_at: { lte: props.body.updated_at_to },
      }),
    ...(props.body.expired_at_from !== undefined &&
      props.body.expired_at_from !== null && {
        expired_at: { gte: props.body.expired_at_from },
      }),
    ...(props.body.expired_at_to !== undefined &&
      props.body.expired_at_to !== null && {
        expired_at: { lte: props.body.expired_at_to },
      }),
  } satisfies Prisma.community_platform_comment_moderationsWhereInput;
  // Build orderBy logic
  const orderByInput =
    props.body.sort === "created_at"
      ? {
          created_at: (props.body.sort_direction ?? "desc") as Prisma.SortOrder,
        }
      : { created_at: "desc" as Prisma.SortOrder };
  // Execute paginated query
  const commentModerations =
    await MyGlobal.prisma.community_platform_comment_moderations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformCommentModerationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_comment_moderations.count({
      where: whereInput,
    });
  // Transform comments using the summary transformer
  const transformedCommentModerations = await ArrayUtil.asyncMap(
    commentModerations,
    CommunityPlatformCommentModerationAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedCommentModerations,
  } satisfies IPageICommunityPlatformCommentModeration.ISummary;
}
