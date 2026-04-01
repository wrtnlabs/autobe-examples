import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
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

export async function patchMallPlatformCustomerOrderItemsOrderItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshot.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshot.ISummary> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        mall_platform_order_id: true,
      },
    });
  void orderItem;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.mall_platform_order_item_snapshotsWhereInput = {
    mall_platform_order_item_id: props.orderItemId,
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              snapshot_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              order_item_status: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              product_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              product_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              product_sku: { contains: props.body.search, mode: "insensitive" },
            },
            {
              variant_sku_code: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_shop_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_shop_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_logo_image_url: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
    ...(props.body.orderItemStatus === undefined
      ? {}
      : {
          order_item_status: {
            contains: props.body.orderItemStatus,
            mode: "insensitive",
          },
        }),
    ...(props.body.productName === undefined
      ? {}
      : {
          product_name: {
            contains: props.body.productName,
            mode: "insensitive",
          },
        }),
    ...(props.body.productSku === undefined
      ? {}
      : {
          product_sku: { contains: props.body.productSku, mode: "insensitive" },
        }),
    ...(props.body.variantSkuCode === undefined
      ? {}
      : {
          variant_sku_code: {
            contains: props.body.variantSkuCode,
            mode: "insensitive",
          },
        }),
    ...(props.body.sellerShopName === undefined
      ? {}
      : {
          seller_shop_name: {
            contains: props.body.sellerShopName,
            mode: "insensitive",
          },
        }),
    ...(props.body.snapshotReason === undefined
      ? {}
      : {
          snapshot_reason: {
            contains: props.body.snapshotReason,
            mode: "insensitive",
          },
        }),
    ...(props.body.snapshotAtFrom === undefined &&
    props.body.snapshotAtTo === undefined
      ? {}
      : {
          snapshot_at: {
            ...(props.body.snapshotAtFrom === undefined
              ? {}
              : { gte: props.body.snapshotAtFrom }),
            ...(props.body.snapshotAtTo === undefined
              ? {}
              : { lte: props.body.snapshotAtTo }),
          },
        }),
    ...(props.body.createdAtFrom === undefined &&
    props.body.createdAtTo === undefined
      ? {}
      : {
          created_at: {
            ...(props.body.createdAtFrom === undefined
              ? {}
              : { gte: props.body.createdAtFrom }),
            ...(props.body.createdAtTo === undefined
              ? {}
              : { lte: props.body.createdAtTo }),
          },
        }),
    ...(props.body.unitPriceMin === undefined &&
    props.body.unitPriceMax === undefined
      ? {}
      : {
          unit_price: {
            ...(props.body.unitPriceMin === undefined
              ? {}
              : { gte: props.body.unitPriceMin }),
            ...(props.body.unitPriceMax === undefined
              ? {}
              : { lte: props.body.unitPriceMax }),
          },
        }),
    ...(props.body.quantityMin === undefined &&
    props.body.quantityMax === undefined
      ? {}
      : {
          quantity: {
            ...(props.body.quantityMin === undefined
              ? {}
              : { gte: props.body.quantityMin }),
            ...(props.body.quantityMax === undefined
              ? {}
              : { lte: props.body.quantityMax }),
          },
        }),
    ...(props.body.lineTotalMin === undefined &&
    props.body.lineTotalMax === undefined
      ? {}
      : {
          line_total: {
            ...(props.body.lineTotalMin === undefined
              ? {}
              : { gte: props.body.lineTotalMin }),
            ...(props.body.lineTotalMax === undefined
              ? {}
              : { lte: props.body.lineTotalMax }),
          },
        }),
  };
  const data =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ snapshot_at: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        snapshot_at: true,
        snapshot_reason: true,
        order_item_status: true,
        product_name: true,
        product_description: true,
        product_sku: true,
        variant_sku_code: true,
        seller_shop_name: true,
        seller_shop_description: true,
        seller_logo_image_url: true,
        unit_price: true,
        quantity: true,
        line_total: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const records =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.count({ where });
  return {
    data: data.map((snapshot) => ({
      id: snapshot.id,
      snapshotAt: toISOStringSafe(snapshot.snapshot_at),
      snapshotReason: snapshot.snapshot_reason,
      orderItemStatus: snapshot.order_item_status,
      productName: snapshot.product_name,
      productDescription: snapshot.product_description,
      productSku: snapshot.product_sku,
      variantSkuCode: snapshot.variant_sku_code,
      sellerShopName: snapshot.seller_shop_name,
      sellerShopDescription: snapshot.seller_shop_description,
      sellerLogoImageUrl: snapshot.seller_logo_image_url,
      unitPrice: snapshot.unit_price,
      quantity: snapshot.quantity,
      lineTotal: snapshot.line_total,
      createdAt: toISOStringSafe(snapshot.created_at),
      updatedAt: toISOStringSafe(snapshot.updated_at),
      deletedAt:
        snapshot.deleted_at === null
          ? null
          : toISOStringSafe(snapshot.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
