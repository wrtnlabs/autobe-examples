import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postShoppingMallGuestShoppingCarts(props: {
  guest: GuestPayload;
  body: IShoppingMallShoppingCart.ICreate;
}): Promise<IShoppingMallShoppingCart> {
  const { body } = props;

  try {
    const now = toISOStringSafe(new Date());

    const created = await MyGlobal.prisma.shopping_mall_shopping_carts.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_customer_id:
          body.shopping_mall_customer_id === null
            ? null
            : (body.shopping_mall_customer_id ?? undefined),
        session_id:
          body.session_id === null ? null : (body.session_id ?? undefined),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    return {
      id: created.id,
      shopping_mall_customer_id:
        created.shopping_mall_customer_id === null
          ? null
          : (created.shopping_mall_customer_id ?? undefined),
      session_id:
        created.session_id === null ? null : (created.session_id ?? undefined),
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Conflict: Shopping cart already exists for this customer or session",
        409,
      );
    }
    throw error;
  }
}
