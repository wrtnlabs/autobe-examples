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
import { DiscussionBoardErrorLogAtSummaryTransformer } from "../transformers/DiscussionBoardErrorLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminErrorLogs(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardErrorLog.IRequest;
}): Promise<IPageIDiscussionBoardErrorLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper null checks
  const whereInput = {
    deleted_at: null,
    ...(props.body.error_type !== undefined &&
      props.body.error_type !== null && {
        error_type: { equals: props.body.error_type },
      }),
    ...(props.body.severity !== undefined &&
      props.body.severity !== null && {
        severity: { equals: props.body.severity },
      }),
    ...(props.body.environment !== undefined &&
      props.body.environment !== null && {
        environment: { equals: props.body.environment },
      }),
    ...(props.body.component !== undefined &&
      props.body.component !== null && {
        component: { equals: props.body.component },
      }),
    ...(props.body.request_path !== undefined &&
      props.body.request_path !== null && {
        request_path: { contains: props.body.request_path },
      }),
    ...(props.body.occurred_at_from !== undefined &&
      props.body.occurred_at_from !== null && {
        occurred_at: { gte: props.body.occurred_at_from },
      }),
    ...(props.body.occurred_at_to !== undefined &&
      props.body.occurred_at_to !== null && {
        occurred_at: { lte: props.body.occurred_at_to },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        error_message: { contains: props.body.search },
      }),
  } satisfies Prisma.discussion_board_error_logsWhereInput;
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_error_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { occurred_at: "desc" },
      ...DiscussionBoardErrorLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_error_logs.count({
      where: whereInput,
    }),
  ]);
  // Transform results using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardErrorLogAtSummaryTransformer.transform,
  );
  // Create the base pagination
  const basePagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  // Create the nested pagination structure according to the DTO hierarchy
  const adminDistStatPagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: basePagination,
      data: typia.random<
        IDiscussionBoardAdministratorDistributionStatistic.IPagination[]
      >(),
    };
  const adminPromotionRequestPagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: adminDistStatPagination,
      data: typia.random<
        IDiscussionBoardAdministratorPromotionRequest.IPagination[]
      >(),
    };
  const sectionPagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: adminPromotionRequestPagination,
    data: typia.random<IDiscussionBoardSection.IPagination[]>(),
  };
  const errorLogPagination: IPageIDiscussionBoardErrorLog.ISummary["pagination"] =
    {
      pagination: sectionPagination,
      data: transformedData,
    };
  return {
    data: transformedData,
    pagination: errorLogPagination,
  } satisfies IPageIDiscussionBoardErrorLog.ISummary;
}
