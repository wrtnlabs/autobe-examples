import { IEcommerceMallCartValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartValidationResult";
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

export async function patchEcommerceMallCustomerCartValidation(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartValidationResult.IRequest;
}): Promise<IEcommerceMallCartValidationResult.ISummary[]> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      user_id: props.customer.id,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      variant_id: true,
      quantity: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_cart_items.count({
    where: {
      user_id: props.customer.id,
    },
  });
  const results = await ArrayUtil.asyncMap(cartItems, async (cartItem) => {
    const variant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
        where: { id: cartItem.variant_id },
        select: {
          id: true,
          product_id: true,
          stock_quantity: true,
          deleted_at: true,
          product: {
            select: {
              seller: {
                select: {
                  id: true,
                  is_suspended: true,
                },
              },
            },
          },
        },
      });
    if (!variant) {
      return {
        id: cartItem.id,
        variant_id: cartItem.variant_id,
        product_id: "" as string & tags.Format<"uuid">,
        seller_id: "" as string & tags.Format<"uuid">,
        quantity: cartItem.quantity,
        is_available: false,
        failure_reasons: ["Variant not found"],
      } satisfies IEcommerceMallCartValidationResult.ISummary;
    }
    const seller = variant.product.seller;
    const failureReasons: string[] = [];
    let isAvailable = true;
    if (variant.deleted_at !== null) {
      isAvailable = false;
      failureReasons.push("Variant no longer exists");
    }
    if (seller.is_suspended) {
      isAvailable = false;
      failureReasons.push("Seller is suspended");
    }
    if (variant.stock_quantity < cartItem.quantity) {
      isAvailable = false;
      failureReasons.push("Insufficient stock");
    }
    return {
      id: cartItem.id,
      variant_id: cartItem.variant_id,
      product_id: variant.product_id as string & tags.Format<"uuid">,
      seller_id: seller.id as string & tags.Format<"uuid">,
      quantity: cartItem.quantity,
      is_available: isAvailable,
      failure_reasons: failureReasons,
    } satisfies IEcommerceMallCartValidationResult.ISummary;
  });
  return results;
}
