import { IEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardBan";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardBanAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

type WhereInput = Prisma.economic_political_discussion_board_bansWhereInput;
export async function patchEconomicPoliticalDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalDiscussionBoardBan.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardBan.ISummary> {
  const {
    page,
    limit,
    banStatus,
    username,
    startDate,
    endDate,
    reason = props.body.reason,
  } = props.body;
  const currentPage = page ?? 1;
  const currentLimit = limit ?? 20;
  const where: WhereInput = {
    deleted_at: null,
    ...(banStatus && { active: banStatus === "active" }),
    ...(username && {
      bannedUser: {
        email: { contains: username },
        ...(startDate && {
          created_at: { gte: startDate },
          ...(endDate && {
            created_at: { lte: endDate },
            ...(reason && { reason: { contains: reason } }),
          }),
        }),
      },
    }),
  };
  const data =
    await MyGlobal.prisma.economic_political_discussion_board_bans.findMany({
      where,
      skip: (currentPage - 1) * currentLimit,
      take: currentLimit,
      ...EconomicPoliticalDiscussionBoardBanAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.economic_political_discussion_board_bans.count({
      where,
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalDiscussionBoardBanAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: total,
      pages: Math.ceil(total / currentLimit),
    },
  };
}
