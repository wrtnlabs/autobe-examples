import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Validate the product variant exists
  const variant =
    await MyGlobal.prisma.shopping_mall_sale_specifications.findFirstOrThrow({
      where: { id: props.body.variantId },
    });
  // Check if item already exists in cart
  const alreadyExists =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_variant_id: props.body.variantId,
      },
    });
  // If item exists, update quantity
  if (alreadyExists) {
    const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: alreadyExists.id },
      data: {
        quantity: alreadyExists.quantity + props.body.quantity,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    // Return cart item using the IShoppingMallCartItem interface
    return {
      quantity: updated.quantity,
    };
  }
  // Otherwise create new cart item
  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      quantity: props.body.quantity,
      price_at_time: variant.price,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_product_variant_id: props.body.variantId,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return cart item using the IShoppingMallCartItem interface
  return {
    quantity: created.quantity,
  };
}
