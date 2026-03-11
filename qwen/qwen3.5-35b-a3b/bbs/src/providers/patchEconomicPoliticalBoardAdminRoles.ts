import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRole";
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

export async function patchEconomicPoliticalBoardAdminRoles(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardAdministratorRole.IRequest;
}): Promise<IPageIEconomicPoliticalBoardAdministratorRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economic_political_board_administrator_rolesWhereInput =
    {
      ...(props.body.grade !== undefined && { grade: props.body.grade }),
      ...(props.body.hasPromotion !== undefined && {
        promoted_at: props.body.hasPromotion
          ? { not: null }
          : props.body.hasPromotion === false
            ? null
            : undefined,
      }),
    } satisfies Prisma.economic_political_board_administrator_rolesWhereInput;
  const orderByInput: Prisma.economic_political_board_administrator_rolesOrderByWithRelationInput[] =
    props.body.sortBy === "created_at"
      ? [{ created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }]
      : props.body.sortBy === "promoted_at"
        ? [{ promoted_at: props.body.sortOrder === "asc" ? "asc" : "desc" }]
        : [{ created_at: "desc" }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_administrator_roles.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.economic_political_board_administrator_roles.count({
      where: whereInput,
    }),
  ]);
  const currentPage = page;
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEconomicPoliticalBoardAdministratorRole.ISummary;
}
