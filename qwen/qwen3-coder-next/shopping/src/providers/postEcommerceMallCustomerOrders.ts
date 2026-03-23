import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerOrders(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallOrder> {
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: { user_id: props.customer.id },
    include: {
      variant: {
        include: {
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  shop_name: true,
                  approval_status: true,
                  is_suspended: true,
                  created_at: true,
                },
              },
              images: {
                select: {
                  id: true,
                  image_url: true,
                  sort_order: true,
                  is_main: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs);
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  const validatedCartItems = await Promise.all(
    cartItems.map(async (item) => {
      const variant = item.variant;
      if (variant.deleted_at !== null) {
        throw new HttpException(
          `Variant ${variant.sku_code} is unavailable`,
          400,
        );
      }
      if (variant.stock_quantity < item.quantity) {
        throw new HttpException(
          `Insufficient stock for ${variant.sku_code}`,
          400,
        );
      }
      return { ...item, variant };
    }),
  );
  const total_price = validatedCartItems.reduce(
    (sum, item) =>
      sum +
      (item.variant.price_override !== null
        ? item.variant.price_override
        : item.variant.product.base_price) *
        item.quantity,
    0,
  );
  const customerProfile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findUniqueOrThrow({
      where: { user_id: props.customer.id },
    });
  const shippingAddress =
    await MyGlobal.prisma.ecommerce_mall_addresses.findFirstOrThrow({
      where: { user_id: props.customer.id, is_default: true },
    });
  const createdOrder = await MyGlobal.prisma.ecommerce_mall_orders.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      customer_id: props.customer.id,
      shipping_address_id: shippingAddress.id,
      total_price,
      order_status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  const orderItems = await Promise.all(
    validatedCartItems.map(async (item) => {
      const price =
        item.variant.price_override !== null
          ? item.variant.price_override
          : item.variant.product.base_price;
      const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.create(
        {
          data: {
            id: v4() as string & tags.Format<"uuid">,
            order_id: createdOrder.id,
            product_id: item.variant.product_id,
            variant_id: item.variant.id,
            seller_id: item.variant.product.seller_id,
            quantity: item.quantity,
            product_name: item.variant.product.name,
            product_description: item.variant.product.description,
            variant_options: JSON.stringify(
              (item.variant as any).option_values ||
                (item.variant as any).options
                  ?.map((o: any) => `${o.name}:${o.value}`)
                  .join(","),
            ),
            product_price: price,
            item_status: "paid",
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      );
      await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          variant_id: item.variant.id,
          quantity_change: -item.quantity,
          reason: "order",
          reference_id: orderItem.id,
          created_at: new Date(),
        },
      });
      await MyGlobal.prisma.ecommerce_mall_product_variants.update({
        where: { id: item.variant.id },
        data: {
          stock_quantity: { decrement: item.quantity },
        },
      });
      return {
        id: orderItem.id,
        created_at: orderItem.created_at,
        updated_at: orderItem.updated_at,
        product_id: orderItem.product_id,
        order_id: orderItem.order_id,
        variant_id: orderItem.variant_id,
        seller_id: orderItem.seller_id,
        quantity: orderItem.quantity,
        product_name: orderItem.product_name,
        product_description: orderItem.product_description,
        variant_options: orderItem.variant_options,
        product_price: orderItem.product_price,
        item_status: orderItem.item_status,
        seller: {
          id: item.variant.product.seller.id,
          created_at: item.variant.product.seller.created_at,
          shop_name: item.variant.product.seller.shop_name,
          approval_status: item.variant.product.seller.approval_status,
          is_suspended: item.variant.product.seller.is_suspended,
        },
        product: {
          seller: {
            id: item.variant.product.seller.id,
            created_at: item.variant.product.seller.created_at,
            shop_name: item.variant.product.seller.shop_name,
            approval_status: item.variant.product.seller.approval_status,
            is_suspended: item.variant.product.seller.is_suspended,
          },
          id: item.variant.product.id,
          created_at: item.variant.product.created_at,
          name: item.variant.product.name,
          base_price: item.variant.product.base_price,
          is_available: item.variant.product.is_available,
          images: item.variant.product.images.map((img) => ({
            id: img.id,
            created_at: img.created_at,
            updated_at: img.updated_at,
            deleted_at: img.deleted_at,
            image_url: img.image_url,
            sort_order: img.sort_order,
            is_main: img.is_main,
          })),
        },
        variant: {
          id: item.variant.id,
          created_at: item.variant.created_at,
          updated_at: item.variant.updated_at,
          deleted_at: item.variant.deleted_at,
          cartItems: [],
          sku_code: item.variant.sku_code,
          price_override: item.variant.price_override,
          stock_quantity: item.variant.stock_quantity,
          product: {
            id: item.variant.product.id,
          },
          inventoryRecords: [],
          orderItems: [],
          options: [],
        },
      };
    }),
  );
  await MyGlobal.prisma.ecommerce_mall_cart_items.deleteMany({
    where: { user_id: props.customer.id },
  });
  const orderPayload = {
    ...createdOrder,
    customer: {
      id: props.customer.id,
      email: props.customer.id,
      created_at: customerProfile.created_at,
      updated_at: customerProfile.updated_at,
      deleted_at: null,
    },
    shippingAddress: {
      id: shippingAddress.id,
      created_at: shippingAddress.created_at,
      updated_at: shippingAddress.updated_at,
      deleted_at: null,
      orders: [],
      phone_number: shippingAddress.phone_number,
      user: {
        email: props.customer.id,
        id: props.customer.id,
        password_hash: "",
        created_at: customerProfile.created_at,
        updated_at: customerProfile.updated_at,
        deleted_at: null,
      },
      recipient_name: shippingAddress.recipient_name,
      street_address: shippingAddress.street_address,
      city: shippingAddress.city,
      state_province: shippingAddress.state_province,
      postal_code: shippingAddress.postal_code,
      country: shippingAddress.country,
      is_default: shippingAddress.is_default,
      customerProfile: {
        id: customerProfile.id,
        created_at: customerProfile.created_at,
        updated_at: customerProfile.updated_at,
        user_id: customerProfile.user_id,
        display_name: customerProfile.display_name,
        phone_number: customerProfile.phone_number,
      },
    },
    orderItems: orderItems,
    orderOverrides: [],
    shipments: [],
  } satisfies Prisma.ecommerce_mall_ordersGetPayload<
    ReturnType<typeof EcommerceMallOrderTransformer.select>
  >;
  return await EcommerceMallOrderTransformer.transform(orderPayload);
}
