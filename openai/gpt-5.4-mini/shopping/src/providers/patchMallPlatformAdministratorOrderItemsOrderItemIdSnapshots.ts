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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorOrderItemsOrderItemIdSnapshots(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshot.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
    where: { id: props.orderItemId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_order_item_snapshotsWhereInput = {
    mall_platform_order_item_id: props.orderItemId,
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
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
        }
      : {}),
    ...(props.body.orderItemStatus !== undefined
      ? {
          order_item_status: {
            contains: props.body.orderItemStatus,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.productName !== undefined
      ? {
          product_name: {
            contains: props.body.productName,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.productSku !== undefined
      ? {
          product_sku: {
            contains: props.body.productSku,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.variantSkuCode !== undefined
      ? {
          variant_sku_code: {
            contains: props.body.variantSkuCode,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.sellerShopName !== undefined
      ? {
          seller_shop_name: {
            contains: props.body.sellerShopName,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.snapshotReason !== undefined
      ? {
          snapshot_reason: {
            contains: props.body.snapshotReason,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.snapshotAtFrom !== undefined
      ? { snapshot_at: { gte: props.body.snapshotAtFrom } }
      : {}),
    ...(props.body.snapshotAtTo !== undefined
      ? {
          snapshot_at: {
            ...(props.body.snapshotAtFrom !== undefined
              ? { gte: props.body.snapshotAtFrom }
              : {}),
            lte: props.body.snapshotAtTo,
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            lte: props.body.createdAtTo,
          },
        }
      : {}),
    ...(props.body.unitPriceMin !== undefined
      ? { unit_price: { gte: props.body.unitPriceMin } }
      : {}),
    ...(props.body.unitPriceMax !== undefined
      ? {
          unit_price: {
            ...(props.body.unitPriceMin !== undefined
              ? { gte: props.body.unitPriceMin }
              : {}),
            lte: props.body.unitPriceMax,
          },
        }
      : {}),
    ...(props.body.quantityMin !== undefined
      ? { quantity: { gte: props.body.quantityMin } }
      : {}),
    ...(props.body.quantityMax !== undefined
      ? {
          quantity: {
            ...(props.body.quantityMin !== undefined
              ? { gte: props.body.quantityMin }
              : {}),
            lte: props.body.quantityMax,
          },
        }
      : {}),
    ...(props.body.lineTotalMin !== undefined
      ? { line_total: { gte: props.body.lineTotalMin } }
      : {}),
    ...(props.body.lineTotalMax !== undefined
      ? {
          line_total: {
            ...(props.body.lineTotalMin !== undefined
              ? { gte: props.body.lineTotalMin }
              : {}),
            lte: props.body.lineTotalMax,
          },
        }
      : {}),
  } satisfies Prisma.mall_platform_order_item_snapshotsWhereInput;
  const snapshots =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findMany({
      where,
      orderBy: [{ snapshot_at: "desc" }, { created_at: "desc" }],
      skip,
      take: limit,
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
  const total = await MyGlobal.prisma.mall_platform_order_item_snapshots.count({
    where,
  });
  return {
    data: snapshots.map(
      (snapshot): IMallPlatformOrderItemSnapshot.ISummary => ({
        id: snapshot.id,
        snapshotAt: snapshot.snapshot_at.toISOString(),
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
        createdAt: snapshot.created_at.toISOString(),
        updatedAt: snapshot.updated_at.toISOString(),
        deletedAt:
          snapshot.deleted_at === null
            ? null
            : snapshot.deleted_at.toISOString(),
      }),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
