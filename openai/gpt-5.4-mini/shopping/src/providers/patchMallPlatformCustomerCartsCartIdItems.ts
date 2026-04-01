import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCartItem";
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

export async function patchMallPlatformCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IMallPlatformCartItem.IRequest;
}): Promise<IPageIMallPlatformCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const cart =
    await MyGlobal.prisma.mall_platform_shopping_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        mall_platform_customer_id: true,
        deleted_at: true,
      },
    });
  if (cart.mall_platform_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (cart.deleted_at !== null) {
    throw new HttpException("Cart is unavailable", 400);
  }
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.body.mallPlatformProductVariantId },
      select: {
        id: true,
        is_active: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        sku_code: true,
        option_values: true,
        price_override: true,
      },
    });
  if (!variant.is_active || variant.deleted_at !== null) {
    throw new HttpException("Variant is unavailable", 400);
  }
  const currentItems = await MyGlobal.prisma.mall_platform_cart_items.findMany({
    where: {
      mall_platform_shopping_cart_id: props.cartId,
      deleted_at: null,
    },
    select: {
      id: true,
      mall_platform_product_variant_id: true,
      quantity: true,
    },
  });
  const targetItem = currentItems.find(
    (item) =>
      item.mall_platform_product_variant_id ===
      props.body.mallPlatformProductVariantId,
  );
  const mergedQuantity =
    targetItem === undefined
      ? props.body.quantity
      : targetItem.quantity + props.body.quantity;
  if (mergedQuantity > 0 && mergedQuantity > 999999999) {
    throw new HttpException("Requested quantity exceeds available stock", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (targetItem === undefined) {
      await tx.mall_platform_cart_items.create({
        data: {
          id: v4(),
          mall_platform_shopping_cart_id: props.cartId,
          mall_platform_product_variant_id:
            props.body.mallPlatformProductVariantId,
          quantity: props.body.quantity,
          availability_state: "available",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    } else {
      await tx.mall_platform_cart_items.update({
        where: { id: targetItem.id },
        data: {
          quantity: mergedQuantity,
          availability_state: "available",
          updated_at: new Date(),
        },
      });
    }
  });
  const data = await MyGlobal.prisma.mall_platform_cart_items.findMany({
    where: {
      mall_platform_shopping_cart_id: props.cartId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      mall_platform_shopping_cart_id: true,
      mall_platform_product_variant_id: true,
      quantity: true,
      availability_state: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.mall_platform_cart_items.count({
    where: {
      mall_platform_shopping_cart_id: props.cartId,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      async (item) =>
        ({
          id: item.id,
          shoppingCart: {
            id: item.mall_platform_shopping_cart_id,
            customer: {
              id: props.customer.id,
              email: "",
              status: "",
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
              deleted_at: null,
            } satisfies IMallPlatformCustomer.ISummary,
            cartItems: [],
            totalPrice: 0,
            createdAt: toISOStringSafe(item.created_at),
            updatedAt: toISOStringSafe(item.updated_at),
            deletedAt:
              item.deleted_at !== null
                ? toISOStringSafe(item.deleted_at)
                : null,
          } satisfies IMallPlatformShoppingCart.ISummary,
          productVariant: {
            id: item.mall_platform_product_variant_id,
            skuCode: "",
            optionValues: "",
            priceOverride: null,
            isActive: true,
            product: {
              id: "",
              name: "",
              description: "",
              basePrice: 0,
              sellerAccount: {
                id: "",
                email: "",
                approvalStatus: "approved",
                rejectionReason: null,
                suspendedAt: null,
                deletedAt: null,
                createdAt: toISOStringSafe(new Date()),
                updatedAt: toISOStringSafe(new Date()),
              } satisfies IMallPlatformSellerAccount.ISummary,
              category: null,
              createdAt: toISOStringSafe(new Date()),
              updatedAt: toISOStringSafe(new Date()),
              deletedAt: null,
            } satisfies IMallPlatformProduct.ISummary,
            createdAt: toISOStringSafe(variant.created_at),
            updatedAt: toISOStringSafe(variant.updated_at),
            deletedAt:
              variant.deleted_at !== null
                ? toISOStringSafe(variant.deleted_at)
                : null,
          } satisfies IMallPlatformProductVariant.ISummary,
          quantity: item.quantity,
          availabilityState: item.availability_state,
          createdAt: toISOStringSafe(item.created_at),
          updatedAt: toISOStringSafe(item.updated_at),
          deletedAt:
            item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
        }) satisfies IMallPlatformCartItem.ISummary,
    ),
  };
}
