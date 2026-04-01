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
  // Note: Current IShoppingMallCart transformer maps cart-level fields and sets items to null.
  // This operation returns the cart container state safely with strict ownership filtering.
  return await ShoppingMallCartTransformer.transform(cart);
}
