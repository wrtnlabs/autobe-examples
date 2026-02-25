import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBanDurationAtSummaryTransformer } from "../transformers/DiscussionBoardBanDurationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBanDurations(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardBanDuration.IRequest;
}): Promise<IPageIDiscussionBoardBanDuration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.discussion_board_ban_durationsWhereInput = {
    deleted_at: null,
    ...(props.body.search &&
      props.body.search.trim() !== "" && {
        OR: [
          { name: { contains: props.body.search, mode: "insensitive" } },
          { description: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
    ...(props.body.duration_hours && {
      duration_hours: {
        ...(props.body.duration_hours.min !== undefined && {
          gte: props.body.duration_hours.min,
        }),
        ...(props.body.duration_hours.max !== undefined && {
          lte: props.body.duration_hours.max,
        }),
      },
    }),
    ...(props.body.is_permanent !== null &&
      props.body.is_permanent !== undefined && {
        is_permanent: props.body.is_permanent,
      }),
  };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_ban_durations.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardBanDurationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_ban_durations.count({
      where: whereConditions,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardBanDurationAtSummaryTransformer.transform,
  );
  const totalRecords = total;
  const totalPages = Math.ceil(totalRecords / limit);
  // Build correct nested pagination structure
  return {
    data: transformedData,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page,
            limit: limit,
            records: totalRecords,
            pages: totalPages,
          } satisfies IPage.IPagination,
          data: [] as IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [] as IDiscussionBoardAdministratorPromotionRequest.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [] as IDiscussionBoardSection.IPagination[],
    } satisfies IPageIDiscussionBoardSection.IPagination,
  };
}
