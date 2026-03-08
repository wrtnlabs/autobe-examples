import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";
import { EconomicPoliticalBoardBanRecordAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminBanRecords(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardBanRecord.IRequest;
}): Promise<IPageIEconomicPoliticalBoardBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput: Prisma.economic_political_board_ban_recordsWhereInput = {
    ...(props.body.dateFrom && { created_at: { gte: props.body.dateFrom } }),
    ...(props.body.dateTo && { created_at: { lte: props.body.dateTo } }),
    ...(props.body.reasonKeywords && {
      reason: { contains: props.body.reasonKeywords, mode: "insensitive" },
    }),
  };
  const orderByInput: Prisma.economic_political_board_ban_recordsOrderByWithRelationInput[] =
    sortBy === "created_at"
      ? [{ created_at: sortOrder as "asc" | "desc" }]
      : sortBy === "user_id"
        ? [{ user_id: sortOrder as "asc" | "desc" }]
        : [{ banned_by_admin_id: sortOrder as "asc" | "desc" }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_ban_records.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      include: {
        user: EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        bannedByAdmin:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.economic_political_board_ban_records.count({
      where: whereInput,
    }),
  ]);
  const resultData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalBoardBanRecordAtSummaryTransformer.transform,
  );
  return {
    data: resultData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
