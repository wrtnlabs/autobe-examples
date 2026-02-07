import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardCommentModerationAtSummaryTransformer } from "../transformers/DiscussionBoardCommentModerationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminCommentsModerations(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardCommentModeration.IRequest;
}): Promise<IPageIDiscussionBoardCommentModeration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput: Prisma.discussion_board_comment_moderationsWhereInput = {
    ...(props.body.action_type && {
      action_type: { contains: props.body.action_type, mode: "insensitive" },
    }),
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" },
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.comment_id && {
      discussion_board_comment_id: props.body.comment_id,
    }),
    ...(props.body.admin_id && {
      discussion_board_admin_id: props.body.admin_id,
    }),
  };
  // Add date range filters using ISO string comparison
  if (props.body.created_at_from || props.body.created_at_to) {
    const dateFilter: Prisma.discussion_board_comment_moderationsWhereInput["created_at"] =
      {};
    if (props.body.created_at_from) {
      dateFilter.gte = props.body.created_at_from; // Prisma handles ISO string comparison
    }
    if (props.body.created_at_to) {
      dateFilter.lte = props.body.created_at_to; // Prisma handles ISO string comparison
    }
    whereInput.created_at = dateFilter;
  }
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_comment_moderations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardCommentModerationAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_comment_moderations.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentModerationAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
