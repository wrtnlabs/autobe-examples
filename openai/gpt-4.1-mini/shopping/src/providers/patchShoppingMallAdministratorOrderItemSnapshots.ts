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

function toTaggedDateTime(
  date: Date,
): string & import("typia").tags.Format<"date-time"> {
  return date.toISOString();
}
export async function patchShoppingMallAdministratorOrderItemSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  /**
   * Prisma where input filter object
   */
  const filters: Array<Prisma.shopping_mall_order_item_snapshotsWhereInput> =
    [];
  if (props.body.productName !== undefined) {
    filters.push({
      product_name: { contains: props.body.productName, mode: "insensitive" },
    });
  }
  if (props.body.variantSku !== undefined) {
    filters.push({
      variant_sku: { contains: props.body.variantSku, mode: "insensitive" },
    });
  }
  if (props.body.itemStatus !== undefined) {
    filters.push({ item_status: { equals: props.body.itemStatus } });
  }
  if (props.body.sellerShopName !== undefined) {
    filters.push({
      seller_shop_name: {
        contains: props.body.sellerShopName,
        mode: "insensitive",
      },
    });
  }
  if (props.body.createdAtFrom !== undefined) {
    filters.push({ created_at: { gte: props.body.createdAtFrom } });
  }
  if (props.body.createdAtTo !== undefined) {
    filters.push({ created_at: { lte: props.body.createdAtTo } });
  }
  filters.push({ deleted_at: null });
  const where: Prisma.shopping_mall_order_item_snapshotsWhereInput = {
    AND: filters,
  };
  const orderBy: Prisma.shopping_mall_order_item_snapshotsOrderByWithRelationInput =
    props.body.sort === "created_at"
      ? { created_at: "asc" }
      : props.body.sort === "-created_at"
        ? { created_at: "desc" }
        : props.body.sort === "product_name"
          ? { product_name: "asc" }
          : props.body.sort === "-product_name"
            ? { product_name: "desc" }
            : { created_at: "desc" };
  const records =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where,
  });
  function toTaggedDateTime(date: Date): string & tags.Format<"date-time"> {
    return date.toISOString();
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      productName: r.product_name,
      variantSku: r.variant_sku,
      variantOptionValues: r.variant_option_values,
      unitPrice: r.unit_price,
      quantity: r.quantity,
      itemStatus: r.item_status,
      sellerShopName: r.seller_shop_name,
      sellerLogoUri: r.seller_logo_uri === null ? null : r.seller_logo_uri,
      createdAt: toTaggedDateTime(r.created_at),
      updatedAt: toTaggedDateTime(r.updated_at),
      deletedAt: r.deleted_at === null ? null : toTaggedDateTime(r.deleted_at),
    })),
  };
}
