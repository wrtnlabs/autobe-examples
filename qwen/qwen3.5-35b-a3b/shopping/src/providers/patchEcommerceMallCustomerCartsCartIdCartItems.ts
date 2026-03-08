import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemAtSummaryTransformer } from "../transformers/EcommerceMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCartsCartIdCartItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IRequest;
}): Promise<IPageIEcommerceMallCartItem.ISummary> {
  const cart = await MyGlobal.prisma.ecommerce_mall_shopping_carts.findUnique({
    where: { id: props.cartId },
    select: { customer_id: true },
  });
  if (cart === null) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderByInput: Prisma.ecommerce_mall_cart_itemsOrderByWithRelationInput =
    props.body.sortOrder === "createdAt_asc"
      ? { created_at: "asc" as const }
      : props.body.sortOrder === "price_asc"
        ? { price: "asc" as const }
        : props.body.sortOrder === "price_desc"
          ? { price: "desc" as const }
          : { created_at: "desc" as const };
  const data = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: { cart_id: props.cartId, deleted_at: null },
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_cart_items.count({
    where: { cart_id: props.cartId, deleted_at: null },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCartItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
