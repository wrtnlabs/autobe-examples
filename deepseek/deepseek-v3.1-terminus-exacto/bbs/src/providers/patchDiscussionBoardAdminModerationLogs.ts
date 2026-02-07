import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardModerationLogAtSummaryTransformer } from "../transformers/DiscussionBoardModerationLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminModerationLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build complex where clause with all filtering options
  const whereInput = {
    deleted_at: null,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.super_admin_id && {
      super_admin_id: props.body.super_admin_id,
    }),
    ...(props.body.target_article_id && {
      target_article_id: props.body.target_article_id,
    }),
    ...(props.body.target_comment_id && {
      target_comment_id: props.body.target_comment_id,
    }),
    ...(props.body.target_user_id && {
      target_user_id: props.body.target_user_id,
    }),
    ...(props.body.target_section_id && {
      target_section_id: props.body.target_section_id,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.performed_at_from && {
      performed_at: { gte: props.body.performed_at_from },
    }),
    ...(props.body.performed_at_to && {
      performed_at: { lte: props.body.performed_at_to },
    }),
    ...(props.body.scheduled_at_from &&
      props.body.scheduled_at_from !== null && {
        scheduled_at: { gte: props.body.scheduled_at_from },
      }),
    ...(props.body.scheduled_at_to &&
      props.body.scheduled_at_to !== null && {
        scheduled_at: { lte: props.body.scheduled_at_to },
      }),
    ...(props.body.completed_at_from &&
      props.body.completed_at_from !== null && {
        completed_at: { gte: props.body.completed_at_from },
      }),
    ...(props.body.completed_at_to &&
      props.body.completed_at_to !== null && {
        completed_at: { lte: props.body.completed_at_to },
      }),
    ...(props.body.action_description_search && {
      action_description: {
        contains: props.body.action_description_search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.discussion_board_moderation_logsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { performed_at: "desc" },
      ...DiscussionBoardModerationLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardModerationLogAtSummaryTransformer.transform,
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
