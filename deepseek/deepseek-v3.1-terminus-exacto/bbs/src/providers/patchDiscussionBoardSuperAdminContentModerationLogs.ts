import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminContentModerationLogs(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardContentModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardContentModerationLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Convert string dates to Date objects for Prisma query
  const created_at_start_date = props.body.created_at_start
    ? new Date(props.body.created_at_start)
    : undefined;
  const created_at_end_date = props.body.created_at_end
    ? new Date(props.body.created_at_end)
    : undefined;
  // Build where conditions with proper date handling
  const whereConditions = {
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.target_content_type && {
      target_content_type: props.body.target_content_type,
    }),
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" as const },
    }),
    ...(created_at_start_date &&
      created_at_end_date && {
        created_at: {
          gte: created_at_start_date,
          lte: created_at_end_date,
        },
      }),
    ...(created_at_start_date &&
      !created_at_end_date && {
        created_at: { gte: created_at_start_date },
      }),
    ...(!created_at_start_date &&
      created_at_end_date && {
        created_at: { lte: created_at_end_date },
      }),
  } satisfies Prisma.discussion_board_content_moderation_logsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_moderation_logs.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      select: {
        id: true,
        action_type: true,
        target_content_type: true,
        target_content_id: true,
        reason: true,
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
    }),
    MyGlobal.prisma.discussion_board_content_moderation_logs.count({
      where: whereConditions,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            records: total satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            pages: pages satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
          } satisfies IPage.IPagination,
          data: [] satisfies IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [] satisfies IDiscussionBoardAdministratorPromotionRequest.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [] satisfies IDiscussionBoardSection.IPagination[],
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: data.map((log) => ({
      id: log.id as string & tags.Format<"uuid">,
      action_type: log.action_type,
      target_content_type: log.target_content_type,
      target_content_id: log.target_content_id as string & tags.Format<"uuid">,
      admin: {
        id: log.admin.id as string & tags.Format<"uuid">,
        email: log.admin.email as string & tags.Format<"email">,
        display_name: log.admin.display_name,
        created_at: toISOStringSafe(log.admin.created_at) as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardAdmin.ISummary,
      created_at: toISOStringSafe(log.created_at) as string &
        tags.Format<"date-time">,
    })),
  };
}
