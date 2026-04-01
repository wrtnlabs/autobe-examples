import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product already deleted", 409);
  }
  const variantIds = await MyGlobal.prisma.ecommerce_mall_product_variants
    .findMany({
      where: { product_id: props.productId },
      select: { id: true },
    })
    .then((v) => v.map((x) => x.id));
  if (variantIds.length === 0) {
    await MyGlobal.prisma.ecommerce_mall_products.delete({
      where: { id: props.productId },
    });
    return;
  }
  const orderItemCount =
    await MyGlobal.prisma.ecommerce_mall_order_items.groupBy({
      by: ["variant_snapshot_id"],
      where: {
        variant_snapshot_id: {
          in: variantIds,
        },
      },
      _count: true,
    });
  if (orderItemCount.some((c: { _count: number }) => c._count > 0)) {
    throw new HttpException(
      "Cannot delete product with paid or shipped order items",
      409,
    );
  }
  const cancellationCount =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.groupBy({
      by: ["order_item_id"],
      where: {
        order_item_id: {
          in: await MyGlobal.prisma.ecommerce_mall_order_items
            .findMany({
              where: {
                variant_snapshot_id: {
                  in: variantIds,
                },
              },
              select: { id: true },
            })
            .then((x) => x.map((i) => i.id)),
        },
        status: {
          notIn: ["completed", "rejected"],
        },
      },
      _count: true,
    });
  if (cancellationCount.some((c: { _count: number }) => c._count > 0)) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      409,
    );
  }
  const refundCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.groupBy({
      by: ["ecommerce_mall_order_item_id"],
      where: {
        ecommerce_mall_order_item_id: {
          in: await MyGlobal.prisma.ecommerce_mall_order_items
            .findMany({
              where: {
                variant_snapshot_id: {
                  in: variantIds,
                },
              },
              select: { id: true },
            })
            .then((x) => x.map((i) => i.id)),
        },
        status: {
          notIn: ["completed", "rejected"],
        },
      },
      _count: true,
    });
  if (refundCount.some((c: { _count: number }) => c._count > 0)) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      409,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_products.delete({
    where: { id: props.productId },
  });
}
