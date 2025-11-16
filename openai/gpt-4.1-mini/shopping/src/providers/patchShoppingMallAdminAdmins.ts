import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const whereCondition = props.body.search
    ? {
        OR: [
          { name: { contains: props.body.search } },
          { email: { contains: props.body.search } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [props.body.sort_by]: props.body.sort_order },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admins.count({ where: whereCondition }),
  ]);

  return {
    data: data.map((admin) => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      is_active: admin.status === "active",
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
