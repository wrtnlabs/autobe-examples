import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const { admin, body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  const skip = Number(page) * Number(limit);

  const [sellers, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        business_name: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({
      where: {
        deleted_at: null,
      },
    }),
  ]);

  const data = sellers.map((seller) => ({
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
  }));

  const pages = Math.ceil(total / Number(limit));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
