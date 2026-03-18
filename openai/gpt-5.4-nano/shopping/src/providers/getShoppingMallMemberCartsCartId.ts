import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCartTransformer } from "../transformers/ShoppingMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberCartsCartId(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCart> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
    where: {
      id: props.cartId,
      shopping_mall_member_id: props.member.id,
      deleted_at: null,
    },
    ...ShoppingMallCartTransformer.select(),
  });
  // Ensure items are available for the transformer, while avoiding manual DTO construction
  // that can break `items`' nullable typing.
  await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: { shopping_mall_cart_id: cart.id, deleted_at: null },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      quantity: true,
      subtotal_amount: true,
      shopping_mall_product_variant_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return await ShoppingMallCartTransformer.transform(cart);
}
