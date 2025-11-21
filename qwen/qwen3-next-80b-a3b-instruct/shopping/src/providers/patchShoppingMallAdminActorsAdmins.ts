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

export async function patchShoppingMallAdminActorsAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const { email } = props.body;

  // Build filter conditions
  const where: Prisma.shopping_mall_adminsWhereInput = {
    deleted_at: null,
    ...(email && { email: { contains: email, mode: "insensitive" } }),
  };

  // Default pagination as IShoppingMallAdmin.IRequest does not define page/limit
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [admins, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admins.count({ where }),
  ]);

  // Map to ISummary — which is defined as string (admin ID)
  const data: IShoppingMallAdmin.ISummary[] = admins.map((admin) => admin.id);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
