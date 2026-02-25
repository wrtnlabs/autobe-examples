import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShoppingCartCollector } from "../collectors/ShoppingMallShoppingCartCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShoppingCartAtSummaryTransformer } from "../transformers/ShoppingMallShoppingCartAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallShoppingCart.ICreate;
}): Promise<IShoppingMallShoppingCart.ISummary> {
  const existing = await MyGlobal.prisma.shopping_mall_shopping_carts.findFirst(
    {
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_variant_id:
          props.body.shopping_mall_product_variant_id,
      },
    },
  );
  const now = toISOStringSafe(new Date());
  if (existing) {
    await MyGlobal.prisma.shopping_mall_shopping_carts.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + props.body.quantity,
        updated_at: now,
      },
    });
  } else {
    await MyGlobal.prisma.shopping_mall_shopping_carts.create({
      data: await ShoppingMallShoppingCartCollector.collect({
        body: props.body,
        shoppingMallCustomers: props.customer,
      }),
    });
  }
  const created =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findFirstOrThrow({
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_variant_id:
          props.body.shopping_mall_product_variant_id,
      },
      ...ShoppingMallShoppingCartAtSummaryTransformer.select(),
    });
  return await ShoppingMallShoppingCartAtSummaryTransformer.transform(
    created as any,
  );
}
