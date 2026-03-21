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

export async function getEcommerceMallCustomerCartItemsItemId(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCartItem> {
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallCartItemTransformer.select(),
    });
  if (cartItem.cart.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallCartItemTransformer.transform(cartItem);
}
