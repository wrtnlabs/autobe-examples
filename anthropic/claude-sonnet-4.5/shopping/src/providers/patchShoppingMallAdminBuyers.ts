import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IPageIShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminBuyers(props: {
  admin: AdminPayload;
  body: IShoppingMallBuyer.IRequest;
}): Promise<IPageIShoppingMallBuyer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_buyers.findMany({
      where: {
        ...(props.body.search && {
          OR: [
            {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              full_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
      },
      skip,
      take: limit,
      orderBy: props.body.orderBy
        ? {
            [props.body.orderBy]: props.body.sort ?? "asc",
          }
        : { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_buyers.count({
      where: {
        ...(props.body.search && {
          OR: [
            {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              full_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
      },
    }),
  ]);

  return {
    data: data.map((buyer) => ({
      id: buyer.id,
      email: buyer.email,
      full_name: buyer.full_name,
      phone_number: buyer.phone_number ?? undefined,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
