import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

export async function patchShoppingMallAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministrator.IRequest;
}): Promise<IPageIShoppingMallAdministrator.ISummary> {
  const {
    email,
    name,
    administratorGradeId,
    isSuperAdmin,
    page: pageParam,
    limit: limitParam,
  } = props.body;
  const page: number = pageParam && pageParam > 0 ? pageParam : 1;
  const limit: number = limitParam && limitParam > 0 ? limitParam : 10;
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_administratorsWhereInput = {
    deleted_at: null,
    ...(email ? { email: { contains: email } } : {}),
    ...(name ? { name: { contains: name } } : {}),
    ...(administratorGradeId
      ? { administrator_grade_id: administratorGradeId }
      : {}),
    ...(typeof isSuperAdmin === "boolean"
      ? { is_super_admin: isSuperAdmin }
      : {}),
  };
  const total: number =
    await MyGlobal.prisma.shopping_mall_administrators.count({ where });
  const admins = await MyGlobal.prisma.shopping_mall_administrators.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      administratorGrade: true,
    },
  });
  const data: IShoppingMallAdministrator.ISummary[] = admins.map((admin) => ({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    isSuperAdmin: admin.is_super_admin,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    administratorGrade: {
      id: admin.administratorGrade.id,
      name: admin.administratorGrade.name,
      grade: admin.administratorGrade.grade,
      superAdministrator: admin.administratorGrade.super_administrator,
    },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
