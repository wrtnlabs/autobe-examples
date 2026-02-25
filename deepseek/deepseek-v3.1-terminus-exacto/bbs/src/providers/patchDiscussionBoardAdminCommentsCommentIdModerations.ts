import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentModeration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminCommentsCommentIdModerations(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentModeration.IRequest;
}): Promise<IPageIDiscussionBoardCommentModeration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause without using Date type - convert strings to native Date for Prisma
  const whereInput: Prisma.discussion_board_comment_moderationsWhereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && { reason: { contains: props.body.search } }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...((props.body.admin_email || props.body.admin_display_name) && {
      admin: {
        ...(props.body.admin_email && { email: props.body.admin_email }),
        ...(props.body.admin_display_name && {
          display_name: { contains: props.body.admin_display_name },
        }),
      },
    }),
  };
  const moderations =
    await MyGlobal.prisma.discussion_board_comment_moderations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        action_type: true,
        reason: true,
        status: true,
        created_at: true,
        admin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_comment_moderations.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: moderations.map((moderation) => ({
      id: moderation.id,
      action_type: moderation.action_type,
      reason: moderation.reason,
      status: moderation.status,
      created_at: toISOStringSafe(moderation.created_at),
      admin: {
        id: moderation.admin.id,
        email: moderation.admin.email,
        display_name: moderation.admin.display_name,
        created_at: toISOStringSafe(moderation.admin.created_at),
      } satisfies IDiscussionBoardAdmin.ISummary,
    })),
  };
}
