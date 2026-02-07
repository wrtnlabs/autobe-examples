import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserContentFlags(props: {
  user: UserPayload;
  body: IDiscussionBoardContentFlag.IRequest;
}): Promise<IPageIDiscussionBoardContentFlag.ISummary> {
  // Validate user authorization - only administrators should access content flags
  if (props.user.type !== "user") {
    throw new HttpException(
      "Access denied. Administrator authorization required.",
      403,
    );
  }
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build comprehensive WHERE clause with all filter conditions
  const whereInput: Prisma.discussion_board_content_flagsWhereInput = {
    deleted_at: null,
    ...(props.body.status &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.reporter_user_id &&
      props.body.reporter_user_id !== null && {
        reporter_user_id: props.body.reporter_user_id,
      }),
    ...(props.body.flagged_article_id &&
      props.body.flagged_article_id !== null && {
        flagged_article_id: props.body.flagged_article_id,
      }),
    ...(props.body.flagged_comment_id &&
      props.body.flagged_comment_id !== null && {
        flagged_comment_id: props.body.flagged_comment_id,
      }),
    ...(props.body.reviewing_admin_id &&
      props.body.reviewing_admin_id !== null && {
        reviewing_admin_id: props.body.reviewing_admin_id,
      }),
    ...(props.body.flag_reason &&
      props.body.flag_reason !== null && {
        flag_reason: {
          contains: props.body.flag_reason,
          mode: "insensitive" as const,
        },
      }),
    ...((props.body.created_at_min || props.body.created_at_max) && {
      created_at: {
        ...(props.body.created_at_min &&
          props.body.created_at_min !== null && {
            gte: props.body.created_at_min,
          }),
        ...(props.body.created_at_max &&
          props.body.created_at_max !== null && {
            lte: props.body.created_at_max,
          }),
      },
    }),
    ...((props.body.resolved_at_min || props.body.resolved_at_max) && {
      resolved_at: {
        ...(props.body.resolved_at_min &&
          props.body.resolved_at_min !== null && {
            gte: props.body.resolved_at_min,
          }),
        ...(props.body.resolved_at_max &&
          props.body.resolved_at_max !== null && {
            lte: props.body.resolved_at_max,
          }),
      },
    }),
  };
  try {
    // Execute parallel queries for data and count
    const [data, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_content_flags.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        select: {
          id: true,
          flag_reason: true,
          status: true,
          created_at: true,
          resolved_at: true,
          reporter_user_id: true,
          flagged_article_id: true,
          flagged_comment_id: true,
        },
      }),
      MyGlobal.prisma.discussion_board_content_flags.count({
        where: whereInput,
      }),
    ]);
    // Transform database results to DTO format with proper type handling
    const transformedData: IDiscussionBoardContentFlag.ISummary[] = data.map(
      (flag) => ({
        id: flag.id,
        flag_reason: flag.flag_reason,
        status: flag.status,
        created_at: toISOStringSafe(flag.created_at),
        resolved_at: flag.resolved_at
          ? toISOStringSafe(flag.resolved_at)
          : null,
        reporter_user_id: flag.reporter_user_id,
        flagged_article_id: flag.flagged_article_id || null,
        flagged_comment_id: flag.flagged_comment_id || null,
      }),
    );
    // Return paginated response
    return {
      data: transformedData,
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit) || 0,
      },
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve content flags", 500);
  }
}
