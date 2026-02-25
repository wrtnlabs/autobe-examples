import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceOrderItemTransformer } from "../transformers/EcommerceOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerOrdersOrderIdItemsOrderItemId(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceOrderItem> {
  const orderItemAuth =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
        order_id: props.orderId,
      },
      select: {
        variant_id: true,
      },
    });
  const variant =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: orderItemAuth.variant_id },
      select: {
        product: {
          select: {
            id: true,
          },
        },
      },
    });
  const orderItemData =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
        order_id: props.orderId,
      },
      ...EcommerceOrderItemTransformer.select(),
    });
  return await EcommerceOrderItemTransformer.transform(orderItemData);
}
