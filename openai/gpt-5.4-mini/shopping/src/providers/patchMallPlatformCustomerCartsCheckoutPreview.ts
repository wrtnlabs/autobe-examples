import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
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

export async function patchMallPlatformCustomerCartsCheckoutPreview(props: {
  customer: CustomerPayload;
  body: IMallPlatformShoppingCart.IRequest;
}): Promise<IMallPlatformShoppingCart.ICheckoutPreview> {
  const cart =
    await MyGlobal.prisma.mall_platform_shopping_carts.findFirstOrThrow({
      where: {
        mall_platform_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        cartItems: {
          where: { deleted_at: null },
          select: {
            id: true,
            quantity: true,
            availability_state: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            productVariant: {
              select: {
                id: true,
                sku_code: true,
                option_values: true,
                price_override: true,
                is_active: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    base_price: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    sellerAccount: {
                      select: {
                        id: true,
                        email: true,
                        approval_status: true,
                        rejection_reason: true,
                        suspended_at: true,
                        deleted_at: true,
                        created_at: true,
                        updated_at: true,
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        parentCategory: { select: { id: true } },
                        name: true,
                        description: true,
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
        },
      },
    });
  if (cart.cartItems.length === 0) {
    throw new HttpException("Checkout cannot begin with an empty cart", 400);
  }
  const shippingAddress = props.body.shippingAddressId
    ? await MyGlobal.prisma.mall_platform_shipping_addresses.findFirstOrThrow({
        where: {
          id: props.body.shippingAddressId,
          deleted_at: null,
        },
        select: {
          id: true,
          recipient_name: true,
          phone_number: true,
          street_address: true,
          city: true,
          state_province: true,
          postal_code: true,
          country: true,
          is_default: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      })
    : await MyGlobal.prisma.mall_platform_shipping_addresses.findFirstOrThrow({
        where: {
          is_default: true,
          deleted_at: null,
        },
        select: {
          id: true,
          recipient_name: true,
          phone_number: true,
          street_address: true,
          city: true,
          state_province: true,
          postal_code: true,
          country: true,
          is_default: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
  const customerSummary = {
    id: cart.customer.id,
    email: cart.customer.email,
    status: cart.customer.status,
    created_at: toISOStringSafe(cart.customer.created_at),
    updated_at: toISOStringSafe(cart.customer.updated_at),
    deleted_at:
      cart.customer.deleted_at === null
        ? null
        : toISOStringSafe(cart.customer.deleted_at),
  } satisfies IMallPlatformCustomer.ISummary;
  const cartSummary = {
    id: cart.id,
    customer: customerSummary,
    cartItems: [],
    totalPrice: 0,
    createdAt: toISOStringSafe(cart.created_at),
    updatedAt: toISOStringSafe(cart.updated_at),
    deletedAt:
      cart.deleted_at === null ? null : toISOStringSafe(cart.deleted_at),
  } satisfies IMallPlatformShoppingCart.ISummary;
  const items = await ArrayUtil.asyncMap(cart.cartItems, async (item) => {
    const sellerAccount = {
      id: item.productVariant.product.sellerAccount.id,
      email: item.productVariant.product.sellerAccount.email,
      approvalStatus: item.productVariant.product.sellerAccount.approval_status,
      rejectionReason:
        item.productVariant.product.sellerAccount.rejection_reason,
      suspendedAt:
        item.productVariant.product.sellerAccount.suspended_at === null
          ? null
          : toISOStringSafe(
              item.productVariant.product.sellerAccount.suspended_at,
            ),
      deletedAt:
        item.productVariant.product.sellerAccount.deleted_at === null
          ? null
          : toISOStringSafe(
              item.productVariant.product.sellerAccount.deleted_at,
            ),
      createdAt: toISOStringSafe(
        item.productVariant.product.sellerAccount.created_at,
      ),
      updatedAt: toISOStringSafe(
        item.productVariant.product.sellerAccount.updated_at,
      ),
    } satisfies IMallPlatformSellerAccount.ISummary;
    const category =
      item.productVariant.product.category === null
        ? null
        : ({
            id: item.productVariant.product.category.id,
            parentCategory: null,
            name: item.productVariant.product.category.name,
            description: item.productVariant.product.category.description,
            createdAt: toISOStringSafe(
              item.productVariant.product.category.created_at,
            ),
            updatedAt: toISOStringSafe(
              item.productVariant.product.category.updated_at,
            ),
            deletedAt:
              item.productVariant.product.category.deleted_at === null
                ? null
                : toISOStringSafe(
                    item.productVariant.product.category.deleted_at,
                  ),
          } satisfies IMallPlatformCategory.ISummary);
    const product = {
      id: item.productVariant.product.id,
      name: item.productVariant.product.name,
      description: item.productVariant.product.description,
      basePrice: item.productVariant.product.base_price,
      sellerAccount,
      category,
      createdAt: toISOStringSafe(item.productVariant.product.created_at),
      updatedAt: toISOStringSafe(item.productVariant.product.updated_at),
      deletedAt:
        item.productVariant.product.deleted_at === null
          ? null
          : toISOStringSafe(item.productVariant.product.deleted_at),
    } satisfies IMallPlatformProduct.ISummary;
    const productVariant = {
      id: item.productVariant.id,
      skuCode: item.productVariant.sku_code,
      optionValues: item.productVariant.option_values,
      priceOverride: item.productVariant.price_override,
      isActive: item.productVariant.is_active,
      product,
      createdAt: toISOStringSafe(item.productVariant.created_at),
      updatedAt: toISOStringSafe(item.productVariant.updated_at),
      deletedAt:
        item.productVariant.deleted_at === null
          ? null
          : toISOStringSafe(item.productVariant.deleted_at),
    } satisfies IMallPlatformProductVariant.ISummary;
    return {
      id: item.id,
      shoppingCart: cartSummary,
      productVariant,
      quantity: item.quantity,
      availabilityState: item.availability_state,
      createdAt: toISOStringSafe(item.created_at),
      updatedAt: toISOStringSafe(item.updated_at),
      deletedAt:
        item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    } satisfies IMallPlatformCartItem.ISummary;
  });
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (item.productVariant.priceOverride ??
        item.productVariant.product.basePrice) *
        item.quantity,
    0,
  );
  const warnings = items.reduce<string[]>((acc, item) => {
    if (
      !item.productVariant.isActive ||
      item.productVariant.deletedAt !== null ||
      item.productVariant.product.deletedAt !== null
    ) {
      acc.push(`Variant ${item.productVariant.skuCode} is unavailable.`);
    }
    if (item.availabilityState !== "available") {
      acc.push(
        `Variant ${item.productVariant.skuCode} is not ready for checkout.`,
      );
    }
    return acc;
  }, []);
  return {
    cart: {
      id: cartSummary.id,
      customer: cartSummary.customer,
      cartItems: items,
      totalPrice: subtotal,
      createdAt: cartSummary.createdAt,
      updatedAt: cartSummary.updatedAt,
      deletedAt: cartSummary.deletedAt,
    },
    shippingAddress: {
      id: shippingAddress.id,
      recipientName: shippingAddress.recipient_name,
      phoneNumber: shippingAddress.phone_number,
      streetAddress: shippingAddress.street_address,
      city: shippingAddress.city,
      stateProvince: shippingAddress.state_province,
      postalCode: shippingAddress.postal_code,
      country: shippingAddress.country,
      isDefault: shippingAddress.is_default,
      createdAt: toISOStringSafe(shippingAddress.created_at),
      updatedAt: toISOStringSafe(shippingAddress.updated_at),
      deletedAt:
        shippingAddress.deleted_at === null
          ? null
          : toISOStringSafe(shippingAddress.deleted_at),
    },
    items,
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    shippingFee: 0,
    total: subtotal,
    isCheckoutAvailable: warnings.length === 0,
    warnings,
  };
}
