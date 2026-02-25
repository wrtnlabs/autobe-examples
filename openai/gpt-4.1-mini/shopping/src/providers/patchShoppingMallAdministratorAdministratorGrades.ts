import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGrade";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAdministratorGrades(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorGrade.IRequest;
}): Promise<IPageIShoppingMallAdministratorGrade.ISummary> {
  const page = props.body.page ?? 1;
  const limitRaw = props.body.limit ?? 10;
  const limit = limitRaw > 100 ? 100 : limitRaw;
  const skip = (page - 1) * limit;
  const gradeFilter: Prisma.shopping_mall_administrator_gradesWhereInput["grade"] =
    {};
  if (props.body.gradeMin !== undefined) gradeFilter.gte = props.body.gradeMin;
  if (props.body.gradeMax !== undefined) gradeFilter.lte = props.body.gradeMax;
  const whereFilter: Prisma.shopping_mall_administrator_gradesWhereInput = {
    deleted_at: null,
    ...(Object.keys(gradeFilter).length > 0 ? { grade: gradeFilter } : {}),
    ...(props.body.superAdministrator !== undefined
      ? { super_administrator: props.body.superAdministrator }
      : {}),
  };
  const total = await MyGlobal.prisma.shopping_mall_administrator_grades.count({
    where: whereFilter,
  });
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_grades.findMany({
      where: whereFilter,
      skip,
      take: limit,
      orderBy: { grade: "asc" },
      select: {
        id: true,
        name: true,
        grade: true,
        super_administrator: true,
      },
    });
  return {
    data: records.map((record) => ({
      id: record.id,
      name: record.name,
      grade: record.grade,
      superAdministrator: record.super_administrator,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
