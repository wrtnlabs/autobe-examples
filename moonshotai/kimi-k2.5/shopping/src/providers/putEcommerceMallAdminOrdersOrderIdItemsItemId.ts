import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  // Verify order item exists, belongs to the specified order, and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      order_id: props.orderId,
      deleted_at: null,
    },
  });
  // Prepare update data with current timestamp
  const updateData: Prisma.ecommerce_mall_order_itemsUpdateInput = {
    updated_at: new Date(),
  };
  // Apply status change if provided in request body
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  // Execute the update operation
  await MyGlobal.prisma.ecommerce_mall_order_items.update({
    where: { id: props.itemId },
    data: updateData,
  });
  // Fetch updated record with full relation data for transformation
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  // Transform Prisma payload to API response DTO
  return await EcommerceMallOrderItemTransformer.transform(updated);
}
