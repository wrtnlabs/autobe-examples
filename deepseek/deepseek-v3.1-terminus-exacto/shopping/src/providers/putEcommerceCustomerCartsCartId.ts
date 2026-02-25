import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceShoppingCartTransformer } from "../transformers/EcommerceShoppingCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IEcommerceShoppingCart> {
  const cart = await MyGlobal.prisma.ecommerce_shopping_carts.findUniqueOrThrow(
    {
      where: { id: props.cartId },
      select: { customer_id: true, deleted_at: true },
    },
  );
  if (cart.customer_id !== props.customer.id) {
    throw new HttpException(
      "Cart does not belong to authenticated customer",
      403,
    );
  }
  if (cart.deleted_at !== null) {
    throw new HttpException("Cart has been deleted", 404);
  }
  const updated = await MyGlobal.prisma.ecommerce_shopping_carts.update({
    where: { id: props.cartId },
    data: { updated_at: new Date() },
    ...EcommerceShoppingCartTransformer.select(),
  });
  return await EcommerceShoppingCartTransformer.transform(updated);
}
