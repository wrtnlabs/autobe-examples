import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartItemTransformer } from "../transformers/EcommerceCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerCartsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IEcommerceCartItem.IUpdate;
}): Promise<IEcommerceCartItem> {
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findUniqueOrThrow(
    {
      where: {
        id: props.cartItemId,
        customer_id: props.customer.id,
        deleted_at: null,
      },
    },
  );
  const variantInventory =
    await MyGlobal.prisma.ecommerce_variant_inventories.findFirst({
      where: {
        ecommerce_product_variant_id: cartItem.product_variant_id,
      },
    });
  if (!variantInventory) {
    throw new HttpException("Stock information not found", 404);
  }
  if (props.body.quantity > variantInventory.quantity) {
    throw new HttpException(
      `Requested quantity ${props.body.quantity} exceeds available stock ${variantInventory.quantity}`,
      400,
    );
  }
  await MyGlobal.prisma.ecommerce_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      quantity: props.body.quantity,
      updated_at: new Date(),
    },
  });
  const updatedWithRelations =
    await MyGlobal.prisma.ecommerce_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...EcommerceCartItemTransformer.select(),
    });
  return await EcommerceCartItemTransformer.transform(updatedWithRelations);
}
