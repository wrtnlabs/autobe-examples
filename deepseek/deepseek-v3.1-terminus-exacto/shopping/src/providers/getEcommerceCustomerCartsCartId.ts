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

export async function getEcommerceCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IEcommerceShoppingCart> {
  // Find cart with ownership validation using relation property name
  const whereInput = {
    id: props.cartId,
    customer: {
      id: props.customer.id,
    },
    deleted_at: null,
  } satisfies Prisma.ecommerce_shopping_cartsWhereInput;
  const cart = await MyGlobal.prisma.ecommerce_shopping_carts.findUniqueOrThrow(
    {
      where: whereInput,
      ...EcommerceShoppingCartTransformer.select(),
    },
  );
  // Transform using existing transformer
  return await EcommerceShoppingCartTransformer.transform(cart);
}
