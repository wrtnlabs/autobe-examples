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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminContentModerationLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardContentModerationLog.ISummary> {
  const current = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (current - 1) * limit;
  // Build WHERE conditions without Date type usage
  const whereConditions = {
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.target_content_type && {
      target_content_type: props.body.target_content_type,
    }),
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" as const },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
  } satisfies Prisma.discussion_board_content_moderation_logsWhereInput;
  // Query data with pagination and admin join
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_moderation_logs.findMany({
      where: whereConditions,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
    }),
    MyGlobal.prisma.discussion_board_content_moderation_logs.count({
      where: whereConditions,
    }),
  ]);
  // Transform data to match ISummary format
  const transformedData = data.map(
    (log) =>
      ({
        id: typia.assert<string & tags.Format<"uuid">>(log.id),
        action_type: log.action_type,
        target_content_type: log.target_content_type,
        target_content_id: typia.assert<string & tags.Format<"uuid">>(
          log.target_content_id,
        ),
        admin: {
          id: typia.assert<string & tags.Format<"uuid">>(log.admin.id),
          email: typia.assert<string & tags.Format<"email">>(log.admin.email),
          display_name: log.admin.display_name,
          created_at: toISOStringSafe(log.admin.created_at),
        } satisfies IDiscussionBoardAdmin.ISummary,
        created_at: toISOStringSafe(log.created_at),
      }) satisfies IDiscussionBoardContentModerationLog.ISummary,
  );
  return {
    pagination: {
      current: current satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardContentModerationLog.ISummary;
}
