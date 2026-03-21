import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCheckoutPrepare(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallCheckout.IPrepare> {
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findUniqueOrThrow({
    where: { ecommerce_mall_customer_id: props.customer.id },
    select: { id: true },
  });
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: { ecommerce_mall_cart_id: cart.id },
    select: {
      id: true,
      quantity: true,
      created_at: true,
      updated_at: true,
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          quantity: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          optionValues: {
            select: {
              id: true,
              key: true,
              value: true,
              created_at: true,
              updated_at: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              base_price: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              seller: {
                select: {
                  id: true,
                  email: true,
                  approval_status: true,
                  created_at: true,
                  seller_profiles: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      logo_uri: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parent: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    },
                  },
                },
              },
              productImages: {
                select: {
                  image_url: true,
                  display_order: true,
                },
                orderBy: { display_order: "asc" },
                take: 1,
              },
              variants: {
                select: {
                  price: true,
                },
              },
              reviews: {
                select: {
                  rating: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const validatedItems = await ArrayUtil.asyncMap(cartItems, async (item) => {
    const product = item.productVariant.product;
    const validatedPrice = item.productVariant.price ?? product.base_price;
    const subtotal = validatedPrice * item.quantity;
    const isVariantDeleted = item.productVariant.deleted_at !== null;
    const isProductDeleted = product.deleted_at !== null;
    const hasStock = item.productVariant.quantity >= item.quantity;
    let status: "available" | "insufficient_stock" | "unavailable";
    if (isVariantDeleted || isProductDeleted) {
      status = "unavailable";
    } else if (!hasStock) {
      status = "insufficient_stock";
    } else {
      status = "available";
    }
    const sellerProfile = product.seller.seller_profiles?.[0];
    const activeReviews = product.reviews.filter((r) => r.deleted_at === null);
    const reviews_count = activeReviews.length;
    const average_rating =
      reviews_count > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / reviews_count
        : 0;
    const variantPrices = product.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const min_price =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : product.base_price;
    const max_price =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : product.base_price;
    const primary_image_url = product.productImages?.[0]?.image_url ?? "";
    return {
      id: item.id,
      product: {
        id: product.id,
        name: product.name,
        min_price,
        max_price,
        primary_image_url,
        seller_name: sellerProfile?.name ?? "",
        average_rating,
        reviews_count: reviews_count as number & tags.Type<"int32">,
        created_at: product.created_at.toISOString(),
      },
      variant: {
        id: item.productVariant.id,
        sku_code: item.productVariant.sku_code,
        price:
          item.productVariant.price !== null
            ? Number(item.productVariant.price)
            : undefined,
        quantity: Number(item.productVariant.quantity),
        optionValues: item.productVariant.optionValues.map((ov) => ({
          id: ov.id,
          key: ov.key,
          value: ov.value,
          created_at: ov.created_at.toISOString(),
          updated_at: ov.updated_at.toISOString(),
          variant: {
            id: item.productVariant.id,
            sku_code: item.productVariant.sku_code,
            price:
              item.productVariant.price !== null
                ? Number(item.productVariant.price)
                : undefined,
            quantity: Number(item.productVariant.quantity),
            optionValues: [],
            created_at: item.productVariant.created_at.toISOString(),
            updated_at: item.productVariant.updated_at.toISOString(),
          },
        })),
        created_at: item.productVariant.created_at.toISOString(),
        updated_at: item.productVariant.updated_at.toISOString(),
      },
      quantity: item.quantity,
      validatedPrice,
      subtotal,
      status,
    };
  });
  const shippingAddressRaw =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        recipient_name: true,
        phone: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        },
      },
    });
  const shippingAddress = shippingAddressRaw
    ? {
        id: shippingAddressRaw.id,
        recipient_name: shippingAddressRaw.recipient_name,
        phone: shippingAddressRaw.phone,
        street_address: shippingAddressRaw.street_address,
        city: shippingAddressRaw.city,
        state: shippingAddressRaw.state,
        postal_code: shippingAddressRaw.postal_code,
        country: shippingAddressRaw.country,
        is_default: shippingAddressRaw.is_default,
        created_at: shippingAddressRaw.created_at.toISOString(),
        updated_at: shippingAddressRaw.updated_at.toISOString(),
        deleted_at: shippingAddressRaw.deleted_at?.toISOString() ?? null,
        customer: {
          id: shippingAddressRaw.customer.id,
          email: shippingAddressRaw.customer.email,
          created_at: shippingAddressRaw.customer.created_at.toISOString(),
          display_name: null,
          status: "active" as const,
        },
      }
    : null;
  const availableItems = validatedItems.filter(
    (item) => item.status === "available",
  );
  const subtotal = availableItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal;
  const unavailableItemsCount = validatedItems.filter(
    (item) =>
      item.status === "insufficient_stock" || item.status === "unavailable",
  ).length;
  return {
    validatedItems,
    shippingAddress,
    hasValidAddress: shippingAddress !== null,
    subtotal,
    total,
    unavailableItemsCount,
  };
}
