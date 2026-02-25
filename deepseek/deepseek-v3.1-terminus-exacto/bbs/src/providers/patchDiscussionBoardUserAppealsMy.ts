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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardBanAppealAtSummaryTransformer } from "../transformers/DiscussionBoardBanAppealAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserAppealsMy(props: {
  user: UserPayload;
  body: IDiscussionBoardBanAppeal.IRequest;
}): Promise<IPageIDiscussionBoardBanAppeal.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput: Prisma.discussion_board_ban_appealsWhereInput = {
    deleted_at: null,
    discussion_board_user_id: props.user.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      appeal_reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  };
  // Add date range filters with proper ISO string handling
  if (props.body.appealed_at_start && props.body.appealed_at_end) {
    whereInput.appealed_at = {
      gte: new Date(props.body.appealed_at_start),
      lte: new Date(props.body.appealed_at_end),
    };
  }
  if (props.body.reviewed_at_start && props.body.reviewed_at_end) {
    whereInput.reviewed_at = {
      gte: new Date(props.body.reviewed_at_start),
      lte: new Date(props.body.reviewed_at_end),
    };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_ban_appeals.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { appealed_at: "desc" as const },
      ...DiscussionBoardBanAppealAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_ban_appeals.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardBanAppealAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        page,
      ),
      limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(limit),
      records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        total,
      ),
      pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        Math.ceil(total / limit),
      ),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
