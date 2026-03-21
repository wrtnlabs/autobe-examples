import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartAtInvertTransformer } from "../transformers/EcommerceMallCartAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomersCart(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallCart.IInvert> {
  // Query cart for the authenticated customer
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirst({
    where: { ecommerce_mall_customer_id: props.customer.id },
    ...EcommerceMallCartAtInvertTransformer.select(),
  });
  // If no cart exists, return empty cart structure with customer info
  if (cart === null) {
    // Get customer data for the response
    const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
      where: { id: props.customer.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        deleted_at: true,
        profile: {
          select: {
            display_name: true,
          },
        },
      },
    });
    if (customer === null) {
      throw new HttpException("Customer not found", 404);
    }
    return {
      id: v4() as string & typia.tags.Format<"uuid">,
      customer: {
        id: customer.id,
        email: customer.email,
        created_at: toISOStringSafe(customer.created_at),
        display_name: customer.profile?.display_name ?? null,
        status: customer.deleted_at === null ? "active" : "deleted",
      } satisfies IEcommerceMallCustomer.ISummary,
      total: 0,
      items: [],
    } satisfies IEcommerceMallCart.IInvert;
  }
  // Transform and return the cart
  return await EcommerceMallCartAtInvertTransformer.transform(cart);
}
