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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentModerationAtSummaryTransformer } from "../transformers/DiscussionBoardCommentModerationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminCommentsModerations(props: {
  admin: AdminPayload;
  body: IDiscussionBoardCommentModeration.IRequest;
}): Promise<IPageIDiscussionBoardCommentModeration.ISummary> {
  const pageNumber = props.body.page;
  const pageLimit = props.body.limit;
  const skipRecords = (pageNumber - 1) * pageLimit;
  // Build where conditions with proper Prisma typing
  const whereFilter = {
    ...(props.body.action_type && {
      action_type: {
        contains: props.body.action_type,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" as const },
    }),
    ...(props.body.comment_id && {
      discussion_board_comment_id: props.body.comment_id,
    }),
    ...(props.body.admin_id && {
      discussion_board_admin_id: props.body.admin_id,
    }),
    ...((props.body.created_at_from || props.body.created_at_to) && {
      created_at: {
        ...(props.body.created_at_from && {
          gte: props.body.created_at_from,
        }),
        ...(props.body.created_at_to && {
          lte: props.body.created_at_to,
        }),
      },
    }),
  } satisfies Prisma.discussion_board_comment_moderationsWhereInput;
  // Execute database queries sequentially
  const moderationRecords =
    await MyGlobal.prisma.discussion_board_comment_moderations.findMany({
      where: whereFilter,
      skip: skipRecords,
      take: pageLimit,
      orderBy: {
        created_at: "desc",
      } satisfies Prisma.discussion_board_comment_moderationsOrderByWithRelationInput,
      ...DiscussionBoardCommentModerationAtSummaryTransformer.select(),
    });
  const totalCount =
    await MyGlobal.prisma.discussion_board_comment_moderations.count({
      where: whereFilter,
    });
  // Transform records using async mapping
  const transformedRecords = await ArrayUtil.asyncMap(
    moderationRecords,
    DiscussionBoardCommentModerationAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: pageNumber,
      limit: pageLimit,
      records: totalCount,
      pages: Math.ceil(totalCount / pageLimit),
    } satisfies IPage.IPagination,
    data: transformedRecords,
  };
}
