import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderNumberItems(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sortBy || "created_at";
  const order = props.body.order || "desc";

  const whereCondition = {
    shopping_mall_order_id: props.orderNumber,
  };

  if (props.body.variantId) {
    (whereCondition as any).shopping_mall_product_variant_id =
      props.body.variantId;
  }

  if (props.body.minQuantity !== undefined) {
    (whereCondition as any).quantity = { gte: props.body.minQuantity };
  }

  if (props.body.search) {
    (whereCondition as any).notes = { contains: props.body.search };
  }

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: order,
      },
      include: {
        productVariant: {
          select: {
            product: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      productId: item.productVariant?.product?.id ?? "",
      variantId: item.shopping_mall_product_variant_id ?? "",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalAmount: item.item_total,
    })),
  };
}
