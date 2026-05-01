import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCartItemCollector } from "../collectors/ShoppingMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.body.productVariantId },
    });
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant has been deleted by the seller", 400);
  }
  const inventoryAgg =
    await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
      where: {
        shopping_mall_product_variant_id: props.body.productVariantId,
      },
      _sum: { quantity_change: true },
    });
  const currentStock: number = inventoryAgg._sum?.quantity_change ?? 0;
  const existing = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_product_variant_id: props.body.productVariantId,
    },
  });
  const totalQuantity: number = (existing?.quantity ?? 0) + props.body.quantity;
  if (totalQuantity > currentStock) {
    throw new HttpException(
      "Insufficient stock available for the requested quantity",
      400,
    );
  }
  if (existing !== null) {
    await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existing.id },
      data: {
        quantity: totalQuantity,
        updated_at: new Date(),
      },
    });
  } else {
    await MyGlobal.prisma.shopping_mall_cart_items.create({
      data: await ShoppingMallCartItemCollector.collect({
        body: props.body,
        shoppingMallCustomers: { id: props.customer.id },
        shoppingMallCustomerSessions: { id: props.customer.session_id },
      }),
    });
  }
  const record =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirstOrThrow({
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_variant_id: props.body.productVariantId,
      },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return await ShoppingMallCartItemTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerCartItems(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCartItem.ICreate;
// }): Promise<IShoppingMallCartItem> {
//   const record = await MyGlobal.prisma.shopping_mall_cart_items.create({
//     data: await ShoppingMallCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallCartItemTransformer.select(),
//   });
//   return await ShoppingMallCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------