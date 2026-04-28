import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformOrderTransformer } from "../transformers/EcommercePlatformOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerCartCheckout(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformCheckout.ICreate;
}): Promise<IEcommercePlatformOrder> {
  const profile =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findUniqueOrThrow(
      {
        where: {
          ecommerce_platform_customer_id: props.customer.id,
        },
        select: {
          id: true,
        },
      },
    );
  await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findUniqueOrThrow(
    {
      where: {
        id: props.body.shipping_address_id,
        deleted_at: null,
        ecommerce_platform_customer_profile_id: profile.id,
      },
      select: {
        id: true,
      },
    },
  );
  const cartItems =
    await MyGlobal.prisma.ecommerce_platform_shopping_cart_items.findMany({
      where: {
        ecommerce_platform_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
        ecommercePlatformProductVariant: {
          select: {
            id: true,
            price: true,
            deleted_at: true,
            product: {
              select: {
                base_price: true,
              },
            },
          },
        },
      },
    });
  if (cartItems.length === 0) {
    throw new HttpException("Shopping cart is empty", 422);
  }
  const activeVariantIds = cartItems
    .filter((item) => item.ecommercePlatformProductVariant.deleted_at === null)
    .map((item) => item.ecommercePlatformProductVariant.id);
  const stockResults =
    await MyGlobal.prisma.ecommerce_platform_inventory_records.groupBy({
      by: ["ecommerce_platform_product_variant_id"],
      where: {
        ecommerce_platform_product_variant_id: {
          in: activeVariantIds,
        },
      },
      _sum: {
        quantity_delta: true,
      },
    });
  const stockMap = new Map<string, number>(
    stockResults.map((r) => [
      r.ecommerce_platform_product_variant_id,
      r._sum.quantity_delta ?? 0,
    ]),
  );
  const unavailable = cartItems.filter((item) => {
    if (item.ecommercePlatformProductVariant.deleted_at !== null) {
      return true;
    }
    const available =
      stockMap.get(item.ecommercePlatformProductVariant.id) ?? 0;
    return available < item.quantity;
  });
  if (unavailable.length > 0) {
    const variantIds = unavailable.map(
      (u) => u.ecommercePlatformProductVariant.id,
    );
    throw new HttpException(
      `Unavailable product variants: ${variantIds.join(", ")}`,
      422,
    );
  }
  const orderId = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    const createdOrder = await tx.ecommerce_platform_orders.create({
      data: {
        id: v4(),
        order_number: `ORD-${Date.now()}-${v4().slice(0, 8)}`,
        status: "paid",
        customerProfile: { connect: { id: profile.id } },
        shippingAddress: { connect: { id: props.body.shipping_address_id } },
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
      },
    });
    for (const cartItem of cartItems) {
      await tx.ecommerce_platform_order_items.create({
        data: {
          id: v4(),
          order: { connect: { id: createdOrder.id } },
          productVariant: {
            connect: { id: cartItem.ecommercePlatformProductVariant.id },
          },
          quantity: cartItem.quantity,
          price:
            cartItem.ecommercePlatformProductVariant.price ??
            cartItem.ecommercePlatformProductVariant.product.base_price,
          status: "paid",
          created_at: now,
          updated_at: now,
        },
      });
    }
    await tx.ecommerce_platform_shopping_cart_items.updateMany({
      where: {
        id: {
          in: cartItems.map((item) => item.id),
        },
        ecommerce_platform_customer_id: props.customer.id,
      },
      data: {
        deleted_at: now,
      },
    });
    return createdOrder.id;
  });
  const record =
    await MyGlobal.prisma.ecommerce_platform_orders.findUniqueOrThrow({
      where: {
        id: orderId,
      },
      ...EcommercePlatformOrderTransformer.select(),
    });
  return await EcommercePlatformOrderTransformer.transform(record);
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
// import { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerCartCheckout(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformCheckout.ICreate;
// }): Promise<IEcommercePlatformOrder> {
//   const record = await MyGlobal.prisma.ecommerce_platform_orders.findFirstOrThrow({
//     ...EcommercePlatformOrderTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------