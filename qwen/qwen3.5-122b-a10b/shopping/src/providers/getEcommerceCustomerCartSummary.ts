import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartItemAtSummaryTransformer } from "../transformers/EcommerceCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerCartSummary(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceCart.ISummary> {
  const cart = await MyGlobal.prisma.ecommerce_carts.findUniqueOrThrow({
    where: {
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      cartItems: {
        where: {
          deleted_at: null,
        },
        ...EcommerceCartItemAtSummaryTransformer.select(),
      },
    },
  });
  const items = await ArrayUtil.asyncMap(
    cart.cartItems,
    EcommerceCartItemAtSummaryTransformer.transform,
  );
  const total_price = items.reduce((sum, item) => {
    const unitPrice =
      item.productVariant.price ?? item.productVariant.product.base_price;
    return sum + unitPrice * item.quantity;
  }, 0);
  return {
    id: cart.id,
    items: items,
    total_price: total_price,
  } satisfies IEcommerceCart.ISummary;
}
