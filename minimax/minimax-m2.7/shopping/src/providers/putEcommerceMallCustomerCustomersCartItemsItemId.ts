import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerCustomersCartItemsItemId(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem> {
  // Find cart item and verify ownership via cart relation
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        ecommerce_mall_cart_id: true,
        cart: {
          select: {
            id: true,
            ecommerce_mall_customer_id: true,
          },
        },
      },
    });
  // Verify cart belongs to authenticated customer (data isolation)
  if (cartItem.cart.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Cart item not found", 404);
  }
  // Update quantity if provided in body
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.itemId },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch updated cart item with full relations for response
  const updatedCartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallCartItemTransformer.select(),
    });
  return EcommerceMallCartItemTransformer.transform(updatedCartItem);
}
