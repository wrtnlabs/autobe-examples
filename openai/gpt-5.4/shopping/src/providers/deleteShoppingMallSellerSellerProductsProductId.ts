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

export async function deleteShoppingMallSellerSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (product.deleted_at !== null || product.status === "deleted") {
    throw new HttpException("Not Found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const blockingOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        status: {
          in: ["paid", "shipped"],
        },
        productVariant: {
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (blockingOrderItem !== null) {
    throw new HttpException(
      "Product deletion is blocked by paid or shipped order items.",
      409,
    );
  }
  const blockingCancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            shopping_mall_product_id: props.productId,
            deleted_at: null,
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (blockingCancellationRequest !== null) {
    throw new HttpException(
      "Product deletion is blocked by pending cancellation requests.",
      409,
    );
  }
  const blockingRefundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            shopping_mall_product_id: props.productId,
            deleted_at: null,
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (blockingRefundRequest !== null) {
    throw new HttpException(
      "Product deletion is blocked by pending refund requests.",
      409,
    );
  }
  const deletedAt: string & tags.Format<"date-time"> = v4().replace(
    /^[\s\S]*$/,
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .format(new globalThis.Date())
      .replace(" ", "T") + ".000Z",
  );
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_products.update({
      where: {
        id: props.productId,
      },
      data: {
        status: "deleted",
        deleted_at: deletedAt,
      },
    });
    await prisma.shopping_mall_product_variants.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      data: {
        deleted_at: deletedAt,
      },
    });
    await prisma.shopping_mall_inventory_records.updateMany({
      where: {
        deleted_at: null,
        productVariant: {
          shopping_mall_product_id: props.productId,
        },
      },
      data: {
        deleted_at: deletedAt,
      },
    });
  });
}
