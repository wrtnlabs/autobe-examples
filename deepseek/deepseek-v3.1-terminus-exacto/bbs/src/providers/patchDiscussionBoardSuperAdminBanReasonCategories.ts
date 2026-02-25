import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanReasonCategory";
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

export async function patchDiscussionBoardSuperAdminBanReasonCategories(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardBanReasonCategory.IRequest;
}): Promise<IPageIDiscussionBoardBanReasonCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && {
        is_active: props.body.is_active,
      }),
  } satisfies Prisma.discussion_board_ban_reason_categoriesWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_ban_reason_categories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        name: true,
        is_active: true,
        sort_order: true,
      },
    }),
    MyGlobal.prisma.discussion_board_ban_reason_categories.count({
      where: whereInput,
    }),
  ]);
  const transformedData = data.map(
    (item) =>
      ({
        id: item.id as string & tags.Format<"uuid">,
        name: item.name,
        is_active: item.is_active,
        sort_order: item.sort_order as number & tags.Type<"int32">,
      }) satisfies IDiscussionBoardBanReasonCategory.ISummary,
  );
  // Create the nested pagination structure according to DTO definitions
  const basePagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const adminDistributionPagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: basePagination,
      data: [] satisfies IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
    };
  const adminPromotionPagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: adminDistributionPagination,
      data: [] satisfies IDiscussionBoardAdministratorPromotionRequest.IPagination[],
    };
  const sectionPagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: adminPromotionPagination,
    data: [] satisfies IDiscussionBoardSection.IPagination[],
  };
  return {
    pagination: sectionPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardBanReasonCategory.ISummary;
}
