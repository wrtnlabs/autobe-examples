import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCartCollector } from "../collectors/ShoppingMallCartCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCartTransformer } from "../transformers/ShoppingMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberCarts(props: {
  member: MemberPayload;
  body: IShoppingMallCart.ICreate;
}): Promise<IShoppingMallCart> {
  const memberEntity =
    await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
      } satisfies Prisma.shopping_mall_membersFindUniqueArgs["select"],
    });
  return MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_carts.findFirst({
      where: { shopping_mall_member_id: props.member.id, deleted_at: null },
      ...ShoppingMallCartTransformer.select(),
    });
    if (existing !== null) {
      return await ShoppingMallCartTransformer.transform(existing);
    }
    const created = await tx.shopping_mall_carts.create({
      data: await ShoppingMallCartCollector.collect({
        body: props.body,
        shoppingMallMembers: memberEntity as unknown as IEntity,
      }),
    });
    const refreshed = await tx.shopping_mall_carts.findUniqueOrThrow({
      where: { id: created.id },
      ...ShoppingMallCartTransformer.select(),
    });
    return await ShoppingMallCartTransformer.transform(refreshed);
  });
}
