import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanAppealAtSummaryTransformer } from "../transformers/DiscussionBoardBanAppealAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAppeals(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanAppeal.IRequest;
}): Promise<IPageIDiscussionBoardBanAppeal.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const validStatuses = ["pending", "under_review", "approved", "rejected"];
  if (props.body.status && !validStatuses.includes(props.body.status)) {
    throw new HttpException("Invalid status value", 400);
  }
  const whereInput: Prisma.discussion_board_ban_appealsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { appeal_reason: { contains: props.body.search, mode: "insensitive" } },
        {
          decision_reason: { contains: props.body.search, mode: "insensitive" },
        },
      ],
    }),
    ...(props.body.status && { status: props.body.status }),
  };
  if (props.body.appealed_at_start || props.body.appealed_at_end) {
    const appealedAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.appealed_at_start) {
      appealedAtFilter.gte = new Date(props.body.appealed_at_start);
    }
    if (props.body.appealed_at_end) {
      appealedAtFilter.lte = new Date(props.body.appealed_at_end);
    }
    whereInput.appealed_at = appealedAtFilter;
  }
  if (props.body.reviewed_at_start || props.body.reviewed_at_end) {
    const reviewedAtFilter: Prisma.DateTimeNullableFilter = {
      not: null,
    };
    if (props.body.reviewed_at_start) {
      reviewedAtFilter.gte = new Date(props.body.reviewed_at_start);
    }
    if (props.body.reviewed_at_end) {
      reviewedAtFilter.lte = new Date(props.body.reviewed_at_end);
    }
    whereInput.reviewed_at = reviewedAtFilter;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_ban_appeals.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { appealed_at: "desc" },
      ...DiscussionBoardBanAppealAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_ban_appeals.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardBanAppealAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardBanAppeal.ISummary;
}
