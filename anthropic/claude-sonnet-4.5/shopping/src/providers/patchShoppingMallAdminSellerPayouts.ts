import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellerPayouts(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerPayout.IRequest;
}): Promise<IPageIShoppingMallSellerPayout> {
  const { body } = props;

  const page = body.page ?? 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [payouts, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_payouts.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: pageSize,
      select: {
        id: true,
        net_payout_amount: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_seller_payouts.count({
      where: {
        deleted_at: null,
      },
    }),
  ]);

  const data: IShoppingMallSellerPayout[] = payouts.map((payout) => ({
    id: payout.id as string & tags.Format<"uuid">,
    net_payout_amount: payout.net_payout_amount,
  }));

  const pages = Math.ceil(total / pageSize);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
