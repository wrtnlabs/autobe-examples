import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationQueueAssignment";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer } from "../transformers/DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminModerationQueues(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentModerationQueueAssignment.IRequest;
}): Promise<IPageIDiscussionBoardContentModerationQueueAssignment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_content_moderation_queuesWhereInput =
    {};
  // Text field filters
  if (props.body.moderation_status !== undefined) {
    whereInput.moderation_status = { equals: props.body.moderation_status };
  }
  if (props.body.priority_level !== undefined) {
    whereInput.priority_level = { equals: props.body.priority_level };
  }
  if (props.body.assigned_admin_id !== undefined) {
    whereInput.assigned_admin_id = { equals: props.body.assigned_admin_id };
  }
  if (props.body.escalated_by_admin_id !== undefined) {
    whereInput.escalated_by_admin_id = {
      equals: props.body.escalated_by_admin_id,
    };
  }
  if (props.body.auto_flagged !== undefined) {
    whereInput.auto_flagged = { equals: props.body.auto_flagged };
  }
  // Date range filters - Prisma requires Date objects internally
  if (
    props.body.created_at_gte !== undefined ||
    props.body.created_at_lte !== undefined
  ) {
    whereInput.created_at = {
      ...(props.body.created_at_gte && {
        gte: new Date(props.body.created_at_gte),
      }),
      ...(props.body.created_at_lte && {
        lte: new Date(props.body.created_at_lte),
      }),
    };
  }
  if (
    props.body.updated_at_gte !== undefined ||
    props.body.updated_at_lte !== undefined
  ) {
    whereInput.updated_at = {
      ...(props.body.updated_at_gte && {
        gte: new Date(props.body.updated_at_gte),
      }),
      ...(props.body.updated_at_lte && {
        lte: new Date(props.body.updated_at_lte),
      }),
    };
  }
  if (
    props.body.assigned_at_gte !== undefined ||
    props.body.assigned_at_lte !== undefined
  ) {
    whereInput.assigned_at = {
      ...(props.body.assigned_at_gte && {
        gte: new Date(props.body.assigned_at_gte),
      }),
      ...(props.body.assigned_at_lte && {
        lte: new Date(props.body.assigned_at_lte),
      }),
    };
  }
  if (
    props.body.resolved_at_gte !== undefined ||
    props.body.resolved_at_lte !== undefined
  ) {
    whereInput.resolved_at = {
      ...(props.body.resolved_at_gte && {
        gte: new Date(props.body.resolved_at_gte),
      }),
      ...(props.body.resolved_at_lte && {
        lte: new Date(props.body.resolved_at_lte),
      }),
    };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_moderation_queues.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_content_moderation_queues.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer.transform,
    ),
    pagination: {
      page: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
