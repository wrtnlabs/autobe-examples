import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceOrderItemStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemStatusHistory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceOrderItemStatusHistoryTransformer } from "../transformers/EcommerceOrderItemStatusHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceOrdersOrderIdItemsItemIdStatusHistoriesHistoryId(props: {
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IEcommerceOrderItemStatusHistory> {
  // Single optimized query validates historical relationship hierarchy:
  // historyId must belong to itemId, which must belong to orderId
  const statusHistory =
    await MyGlobal.prisma.ecommerce_order_item_status_histories.findUnique({
      where: {
        id: props.historyId,
        orderItem: {
          id: props.itemId,
          order: {
            id: props.orderId,
          },
        },
      },
      ...EcommerceOrderItemStatusHistoryTransformer.select(),
    });
  if (!statusHistory) {
    throw new HttpException(
      "Status history record not found or does not belong to the specified order and item",
      404,
    );
  }
  // Note: Authorization checks (customer/seller/admin) are validated at API gateway level
  // This function only validates data relationships and returns transformed response
  return await EcommerceOrderItemStatusHistoryTransformer.transform(
    statusHistory,
  );
}
