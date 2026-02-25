import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardModeratedContentHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardModeratedContentHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminModeratedContentHistories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModeratedContentHistory.IRequest;
}): Promise<IPageIDiscussionBoardModeratedContentHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_moderation_logsWhereInput = {
    deleted_at: null,
    admin: { deleted_at: null },
    superAdmin: { deleted_at: null },
  };
  // Apply filters with proper null/undefined handling
  if (props.body.action_type) {
    whereInput.action_type = { contains: props.body.action_type };
  }
  if (props.body.admin_id !== undefined) {
    whereInput.admin_id =
      props.body.admin_id === null ? null : props.body.admin_id;
  }
  if (props.body.super_admin_id !== undefined) {
    whereInput.super_admin_id =
      props.body.super_admin_id === null ? null : props.body.super_admin_id;
  }
  if (props.body.target_article_id !== undefined) {
    whereInput.target_article_id =
      props.body.target_article_id === null
        ? null
        : props.body.target_article_id;
  }
  if (props.body.target_comment_id !== undefined) {
    whereInput.target_comment_id =
      props.body.target_comment_id === null
        ? null
        : props.body.target_comment_id;
  }
  if (props.body.target_user_id !== undefined) {
    whereInput.target_user_id =
      props.body.target_user_id === null ? null : props.body.target_user_id;
  }
  if (props.body.target_section_id !== undefined) {
    whereInput.target_section_id =
      props.body.target_section_id === null
        ? null
        : props.body.target_section_id;
  }
  if (props.body.status) {
    whereInput.status = props.body.status;
  }
  if (props.body.action_description) {
    whereInput.action_description = { contains: props.body.action_description };
  }
  if (props.body.performed_at_from || props.body.performed_at_to) {
    whereInput.performed_at = {};
    if (props.body.performed_at_from) {
      whereInput.performed_at.gte = props.body.performed_at_from;
    }
    if (props.body.performed_at_to) {
      whereInput.performed_at.lte = props.body.performed_at_to;
    }
  }
  if (props.body.created_at_from || props.body.created_at_to) {
    whereInput.created_at = {};
    if (props.body.created_at_from) {
      whereInput.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      whereInput.created_at.lte = props.body.created_at_to;
    }
  }
  const data = await MyGlobal.prisma.discussion_board_moderation_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { performed_at: "desc" },
    ...DiscussionBoardModeratedContentHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_moderation_logs.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardModeratedContentHistoryAtSummaryTransformer.transform,
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
