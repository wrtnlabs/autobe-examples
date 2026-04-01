import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteMallPlatformAdministratorProductsProductId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const blockingOrderItem = await prisma.mall_platform_order_items.findFirst({
      where: {
        mall_platform_product_variant_id: {
          equals: product.id,
        },
        status: {
          in: ["paid", "shipped"],
        },
      },
      select: {
        id: true,
      },
    });
    if (blockingOrderItem !== null) {
      throw new HttpException(
        "Product cannot be deleted because it has pending paid or shipped order items.",
        409,
      );
    }
    const blockingCancellationRequest =
      await prisma.mall_platform_cancellation_requests.findFirst({
        where: {
          orderItem: {
            productVariant: {
              mall_platform_product_id: product.id,
            },
          },
          status: "pending",
        },
        select: {
          id: true,
        },
      });
    if (blockingCancellationRequest !== null) {
      throw new HttpException(
        "Product cannot be deleted because it has pending cancellation requests.",
        409,
      );
    }
    const blockingRefundRequest =
      await prisma.mall_platform_refund_requests.findFirst({
        where: {
          orderItem: {
            productVariant: {
              mall_platform_product_id: product.id,
            },
          },
          status: "pending",
        },
        select: {
          id: true,
        },
      });
    if (blockingRefundRequest !== null) {
      throw new HttpException(
        "Product cannot be deleted because it has pending refund requests.",
        409,
      );
    }
    await prisma.mall_platform_products.delete({
      where: {
        id: product.id,
      },
    });
  });
}
