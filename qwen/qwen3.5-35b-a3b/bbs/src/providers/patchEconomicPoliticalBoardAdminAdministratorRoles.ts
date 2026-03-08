import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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

export async function patchEconomicPoliticalBoardAdminAdministratorRoles(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardAdministratorRole.IRequest;
}): Promise<IPageIEconomicPoliticalBoardAdministratorRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economic_political_board_administrator_rolesWhereInput =
    {
      ...(props.body.grade !== undefined && { grade: props.body.grade }),
    };
  const orderByInput: Prisma.economic_political_board_administrator_rolesOrderByWithRelationInput =
    props.body.sort === "grade"
      ? { grade: (props.body.direction ?? "desc") as "asc" | "desc" }
      : props.body.sort === "promoted_at"
        ? { promoted_at: (props.body.direction ?? "desc") as "asc" | "desc" }
        : { created_at: (props.body.direction ?? "desc") as "asc" | "desc" };
  const data =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findMany(
      {
        where: whereInput,
        orderBy: orderByInput,
        skip,
        take: limit,
        ...EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.economic_political_board_administrator_roles.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform,
    ),
  };
}
