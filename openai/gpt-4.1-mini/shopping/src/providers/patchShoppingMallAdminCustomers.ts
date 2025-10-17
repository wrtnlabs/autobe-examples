import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const { admin, body } = props;

  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;

  // Coerce to plain numbers stripping branded tags
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.nickname !== undefined &&
      body.nickname !== null && { nickname: { contains: body.nickname } }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { email: { contains: body.search } },
          { nickname: { contains: body.search } },
        ],
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_customers.count({ where }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    email: item.email,
    nickname: item.nickname ?? null,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data,
  };
}
