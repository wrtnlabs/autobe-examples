import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
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

export async function patchDiscussionBoardSuperAdminSystemAnalyticsErrors(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardErrorLog.IRequest;
}): Promise<IPageIDiscussionBoardErrorLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.error_type && { error_type: props.body.error_type }),
    ...(props.body.severity && { severity: props.body.severity }),
    ...(props.body.environment && { environment: props.body.environment }),
    ...(props.body.component && { component: props.body.component }),
    ...(props.body.request_path && {
      request_path: { contains: props.body.request_path },
    }),
    ...(props.body.search && {
      error_message: { contains: props.body.search },
    }),
    ...(props.body.occurred_at_from && {
      occurred_at: { gte: props.body.occurred_at_from },
    }),
    ...(props.body.occurred_at_to && {
      occurred_at: { lte: props.body.occurred_at_to },
    }),
  } satisfies Prisma.discussion_board_error_logsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_error_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { occurred_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_error_logs.count({ where: whereInput }),
  ]);
  const basePagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total > 0 ? Math.ceil(total / limit) : 0,
  } satisfies IPage.IPagination;
  const adminDistributionStatisticPagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: basePagination,
      data: [],
    } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;
  const adminPromotionRequestPagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: adminDistributionStatisticPagination,
      data: [],
    } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;
  const sectionPagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: adminPromotionRequestPagination,
    data: [],
  } satisfies IPageIDiscussionBoardSection.IPagination;
  return {
    pagination: sectionPagination,
    data: data.map(
      (log) =>
        ({
          id: log.id as string & tags.Format<"uuid">,
          error_type: log.error_type,
          severity: log.severity,
          environment: log.environment,
          component: log.component ?? null,
          occurred_at: toISOStringSafe(log.occurred_at) as string &
            tags.Format<"date-time">,
        }) satisfies IDiscussionBoardErrorLog.ISummary,
    ),
  } satisfies IPageIDiscussionBoardErrorLog.ISummary;
}
