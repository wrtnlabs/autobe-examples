import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminBanRecords(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardBanRecord.IRequest;
}): Promise<IPageIEconomicPoliticalBoardBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economic_political_board_ban_recordsWhereInput = {
    ...(props.body.userId && { user_id: props.body.userId }),
    ...(props.body.bannedByAdminId && {
      banned_by_admin_id: props.body.bannedByAdminId,
    }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.reasonKeyword && {
      reason: { contains: props.body.reasonKeyword, mode: "insensitive" },
    }),
  } satisfies Prisma.economic_political_board_ban_recordsWhereInput;
  const orderByInput = (
    props.body.sortBy === "oldest"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.economic_political_board_ban_recordsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_ban_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        user: EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        bannedByAdmin:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        reason: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.economic_political_board_ban_records.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(data, async (record) => {
    return {
      id: record.id as string & tags.Format<"uuid">,
      user: await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
        record.user,
      ),
      bannedByAdmin:
        await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
          record.bannedByAdmin,
        ),
      reason: record.reason,
      createdAt: record.created_at.toISOString(),
    } satisfies IEconomicPoliticalBoardBanRecord.ISummary;
  });
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
