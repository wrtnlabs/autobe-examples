import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

export async function patchShoppingMallAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministrator.IRequest;
}): Promise<IPageIShoppingMallAdministrator.ISummary> {
  // Pagination parameters are not present in IRequest, use defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query non-deleted administrators
  const data = await MyGlobal.prisma.shopping_mall_administrators.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      is_super_admin: true,
      administrator_grade_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Count total active administrators
  const total = await MyGlobal.prisma.shopping_mall_administrators.count({
    where: { deleted_at: null },
  });
  // Fetch administrator grades for mapping
  const gradeIds = Array.from(
    new Set(data.map((d) => d.administrator_grade_id)),
  );
  const grades =
    await MyGlobal.prisma.shopping_mall_administrator_grades.findMany({
      where: { id: { in: gradeIds } },
      select: { id: true, name: true },
    });
  const gradeMap = new Map(grades.map((g) => [g.id, g.name]));
  // Construct result DTO
  return {
    data: data.map((record) => ({
      id: record.id,
      email: record.email,
      name: record.name,
      is_super_admin: record.is_super_admin,
      administrator_grade_id: record.administrator_grade_id,
      administrator_grade: {
        id: record.administrator_grade_id,
        name: gradeMap.get(record.administrator_grade_id) ?? "",
      },
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
