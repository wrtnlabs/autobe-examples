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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminErrorLogs(props: {
  admin: AdminPayload;
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
    ...(props.body.request_path && { request_path: props.body.request_path }),
    ...(props.body.occurred_at_from && {
      occurred_at: {
        gte: new Date(props.body.occurred_at_from),
      },
    }),
    ...(props.body.occurred_at_to && {
      occurred_at: {
        lte: new Date(props.body.occurred_at_to),
      },
    }),
    ...(props.body.search && {
      OR: [
        {
          error_message: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          error_type: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  } satisfies Prisma.discussion_board_error_logsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_error_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { occurred_at: "desc" as const },
      select: {
        id: true,
        error_type: true,
        severity: true,
        environment: true,
        component: true,
        occurred_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_error_logs.count({
      where: whereInput,
    }),
  ]);
  return {
    data: data.map(
      (record) =>
        ({
          id: record.id,
          error_type: record.error_type,
          severity: record.severity,
          environment: record.environment,
          component: record.component ?? null,
          occurred_at: toISOStringSafe(record.occurred_at),
        }) satisfies IDiscussionBoardErrorLog.ISummary,
    ),
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            pagination: {
              current: page satisfies number as number,
              limit: limit satisfies number as number,
              records: total satisfies number as number,
              pages: Math.ceil(total / limit) satisfies number as number,
            } satisfies IPage.IPagination,
            data: [],
          } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
          data: [],
        } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardSection.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardErrorLog.ISummary["pagination"],
  } satisfies IPageIDiscussionBoardErrorLog.ISummary;
}
