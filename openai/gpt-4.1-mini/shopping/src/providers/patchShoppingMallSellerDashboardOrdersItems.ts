import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerDashboardOrdersItems(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest & {
    page?: number;
    limit?: number;
    status?: string;
    shoppingMallOrderId?: string;
    shoppingMallProductVariantId?: string;
  };
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 50;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_order_itemsWhereInput = {
    productVariant: {
      product: {
        seller_id: props.seller.id,
      },
    },
  };
  if (typeof props.body.status === "string") {
    where.status = props.body.status;
  }
  if (typeof props.body.shoppingMallOrderId === "string") {
    where.shopping_mall_order_id = props.body.shoppingMallOrderId;
  }
  if (typeof props.body.shoppingMallProductVariantId === "string") {
    where.shopping_mall_product_variant_id =
      props.body.shoppingMallProductVariantId;
  }
  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where,
  });
  return {
    data: items.map((item) => ({
      id: item.id,
      shoppingMallOrderId: item.shopping_mall_order_id,
      shoppingMallProductVariantId: item.shopping_mall_product_variant_id,
      quantity: item.quantity,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
