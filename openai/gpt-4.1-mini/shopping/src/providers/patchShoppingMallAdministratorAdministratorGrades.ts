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
  // Since props.body.page and limit do not exist, use default pagination values
  const pageNumber = 1;
  const limitNumber = 20;
  const skipCount = (pageNumber - 1) * limitNumber;
  const totalRecords =
    await MyGlobal.prisma.shopping_mall_administrator_grades.count();
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_grades.findMany({
      skip: skipCount,
      take: limitNumber,
      orderBy: { grade: "desc" },
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
      super_administrator: record.super_administrator,
    })),
    pagination: {
      current: pageNumber,
      limit: limitNumber,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limitNumber),
    },
  };
}
