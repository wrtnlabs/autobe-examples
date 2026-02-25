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

export async function deleteEcommerceSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const pendingOrderItems = await MyGlobal.prisma.ecommerce_order_items.count({
    where: {
      variant_id: props.productId,
      status: {
        in: ["pending", "processing"],
      },
    },
  });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot delete product with pending or processing orders",
      400,
    );
  }
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_refund_requests.count({
      where: {
        order_item_id: props.productId,
      },
    });
  if (pendingRefundRequests > 0) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      400,
    );
  }
  await MyGlobal.prisma.ecommerce_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
