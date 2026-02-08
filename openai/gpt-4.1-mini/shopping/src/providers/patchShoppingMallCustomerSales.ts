import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSales(props: {
  customer: CustomerPayload;
  body: IShoppingMallSale.IRequest;
}): Promise<IPageIShoppingMallSale.ISummary> {
  // Use local type assertion for properties that may exist but are not defined in IRequest
  // page
  const page: number =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const limit: number =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 20;
  if (page < 1)
    throw new HttpException("Page number must be greater than 0", 400);
  if (limit < 1) throw new HttpException("Limit must be greater than 0", 400);
  const whereClause: Prisma.shopping_mall_salesWhereInput = {
    deleted_at: null,
    ...((props.body as any).category_id
      ? { category_id: (props.body as any).category_id }
      : {}),
    ...((props.body as any).seller_id
      ? { seller_id: (props.body as any).seller_id }
      : {}),
    ...((props.body as any).status
      ? { status: (props.body as any).status }
      : {}),
    ...((props.body as any).name
      ? { name: { contains: (props.body as any).name, mode: "insensitive" } }
      : {}),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sales.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        base_price: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
        images: {
          where: { deleted_at: null },
          orderBy: { display_order: "asc" },
          take: 1,
          select: {
            image_url: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_sales.count({ where: whereClause }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => {
      const id = record.id;
      const categoryId = record.category.id;
      const sellerId = record.seller.id;
      const thumbnailUrl =
        record.images.length > 0 && record.images[0].image_url
          ? record.images[0].image_url
          : null;
      return {
        id,
        name: record.name,
        base_price: record.base_price,
        category: {
          id: categoryId,
          name: record.category.name,
        },
        seller: {
          id: sellerId,
        },
        thumbnail_url: thumbnailUrl,
      };
    }),
  };
}
