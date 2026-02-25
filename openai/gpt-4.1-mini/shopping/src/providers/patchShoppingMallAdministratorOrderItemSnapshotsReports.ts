import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorOrderItemSnapshotsReports(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const {
    productName,
    variantSku,
    itemStatus,
    sellerShopName,
    createdAtFrom,
    createdAtTo,
    page = 1,
    limit = 100,
    sort = "-created_at",
  } = props.body;
  const validPage = page >= 1 ? page : 1;
  const validLimit = limit >= 1 && limit <= 100 ? limit : 100;
  const skip = (validPage - 1) * validLimit;
  const where: Prisma.shopping_mall_order_item_snapshotsWhereInput = {
    AND: [
      ...(productName ? [{ product_name: { contains: productName } }] : []),
      ...(variantSku ? [{ variant_sku: { contains: variantSku } }] : []),
      ...(itemStatus ? [{ item_status: itemStatus }] : []),
      ...(sellerShopName
        ? [{ seller_shop_name: { contains: sellerShopName } }]
        : []),
      ...(createdAtFrom
        ? [{ created_at: { gte: new Date(createdAtFrom) } }]
        : []),
      ...(createdAtTo ? [{ created_at: { lte: new Date(createdAtTo) } }] : []),
    ],
  };
  const orderBy: Prisma.shopping_mall_order_item_snapshotsOrderByWithRelationInput =
    sort === "created_at"
      ? { created_at: "asc" }
      : sort === "-created_at"
        ? { created_at: "desc" }
        : sort === "product_name"
          ? { product_name: "asc" }
          : sort === "-product_name"
            ? { product_name: "desc" }
            : { created_at: "desc" };
  const data =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: validLimit,
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      productName: item.product_name,
      variantSku: item.variant_sku,
      variantOptionValues: item.variant_option_values,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      itemStatus: item.item_status,
      sellerShopName: item.seller_shop_name,
      sellerLogoUri: item.seller_logo_uri ?? null,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
    pagination: {
      current: validPage,
      limit: validLimit,
      records: total,
      pages: Math.ceil(total / validLimit),
    },
  };
}
