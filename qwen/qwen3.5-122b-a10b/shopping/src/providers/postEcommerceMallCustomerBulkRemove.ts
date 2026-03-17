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

export async function postEcommerceMallCustomerBulkRemove(props: {
  customer: CustomerPayload;
  body: {
    ids: (string & tags.Format<"uuid">)[];
  };
}): Promise<IEcommerceMallCartItem.ISummary[]> {
  const { ids } = props.body;
  if (ids.length === 0) {
    return [];
  }
  // Validate ownership for each cart item
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      id: { in: ids },
      customer_id: props.customer.id,
      deleted_at: null,
    },
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
  } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs);
  if (cartItems.length !== ids.length) {
    throw new HttpException(
      "Some cart items not found or do not belong to customer",
      404,
    );
  }
  // Delete all cart items in transaction
  await MyGlobal.prisma.ecommerce_mall_cart_items.deleteMany({
    where: {
      id: { in: ids },
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Transform and return removed items
  const summaries = await Promise.all(
    cartItems.map(async (item) => {
      return await EcommerceMallCartItemAtSummaryTransformer.transform(item);
    }),
  );
  return summaries;
}
