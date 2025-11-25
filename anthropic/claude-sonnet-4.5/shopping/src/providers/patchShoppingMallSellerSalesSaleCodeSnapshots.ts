import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSalesSaleCodeSnapshots(props: {
  seller: SellerPayload;
  saleCode: string;
  body: IShoppingMallSaleSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleSnapshot.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  if (sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sort === "created_at" ? "asc" : "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_snapshots.findMany({
      where: {
        shopping_mall_sale_id: sale.id,
        ...(props.body.status && {
          status: props.body.status,
        }),
        ...(props.body.created_at_from || props.body.created_at_to
          ? {
              created_at: {
                ...(props.body.created_at_from && {
                  gte: props.body.created_at_from,
                }),
                ...(props.body.created_at_to && {
                  lte: props.body.created_at_to,
                }),
              },
            }
          : {}),
      },
      skip,
      take: limit,
      orderBy: {
        created_at: sortOrder,
      },
    }),
    MyGlobal.prisma.shopping_mall_sale_snapshots.count({
      where: {
        shopping_mall_sale_id: sale.id,
        ...(props.body.status && {
          status: props.body.status,
        }),
        ...(props.body.created_at_from || props.body.created_at_to
          ? {
              created_at: {
                ...(props.body.created_at_from && {
                  gte: props.body.created_at_from,
                }),
                ...(props.body.created_at_to && {
                  lte: props.body.created_at_to,
                }),
              },
            }
          : {}),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((snapshot) => ({
      id: snapshot.id,
      shopping_mall_sale_id: snapshot.shopping_mall_sale_id,
      title: snapshot.title,
      code: snapshot.code,
      status: snapshot.status,
      created_at: toISOStringSafe(snapshot.created_at),
    })),
  };
}
