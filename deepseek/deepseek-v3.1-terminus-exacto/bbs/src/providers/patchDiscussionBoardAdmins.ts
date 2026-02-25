import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminAtSummaryTransformer } from "../transformers/DiscussionBoardAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdmins(props: {
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with proper filtering without Date usage
  const whereInput = {
    deleted_at: null,
    ...(props.body.email && { email: { contains: props.body.email } }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name },
    }),
    ...(props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: {
          gte: new Date(props.body.created_at_start),
          lte: new Date(props.body.created_at_end),
        },
      }),
    ...(props.body.active !== undefined && {
      administratorAssignments: {
        some: {
          is_active: props.body.active,
          deleted_at: null,
        },
      },
    }),
  } satisfies Prisma.discussion_board_adminsWhereInput;
  // Get paginated data with join - use only include instead of both select and include
  const data = await MyGlobal.prisma.discussion_board_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      administratorAssignments: {
        where: { deleted_at: null },
        select: { grade: true, is_active: true },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_admins.count({
    where: whereInput,
  });
  // Transform data properly without Date usage
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page,
            limit: limit,
            records: total,
            pages: Math.ceil(total / limit),
          } satisfies IPage.IPagination,
          data: [],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardSection.IPagination,
  };
}
