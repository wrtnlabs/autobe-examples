import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerCart(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallCartItem> {
  const whereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_cart_itemsWhereInput;
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: whereInput,
    orderBy: { added_at: "desc" },
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
  });
  const items = await ArrayUtil.asyncMap(
    cartItems,
    EcommerceMallCartItemAtSummaryTransformer.transform,
  );
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return {
    items,
    total,
  } satisfies IEcommerceMallCartItem;
}
