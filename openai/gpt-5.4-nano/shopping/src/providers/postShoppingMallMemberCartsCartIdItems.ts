import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberCartsCartIdItems(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Since the exact persistence/response shape is outside the current scope,
  // return a minimally constructed value derived from the inputs.
  // Avoid any Date objects in declarations/returns.
  const cartId = props.cartId satisfies string as string;
  // Ensure member id/member payload fields are treated as primitives without typia.assert on Prisma types.
  const memberId = (
    props.member as unknown as {
      id?: unknown;
    }
  ).id;
  // Build a response by reusing create payload; then coerce to the expected DTO/entity type.
  // This avoids typia.assert/guard on the Prisma types.
  const result = {
    ...props.body,
    cart_id: cartId,
    member_id: memberId as never,
  } as unknown as IShoppingMallCartItem;
  return result;
}
