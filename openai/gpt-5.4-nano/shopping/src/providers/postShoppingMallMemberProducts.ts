import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductCollector } from "../collectors/ShoppingMallProductCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberProducts(props: {
  member: MemberPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const seller = await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { id: true, deleted_at: true },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("You're not enrolled", 403);
  }
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_category_id },
    select: { id: true, deleted_at: true },
  });
  const existed = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      shopping_mall_seller_id: props.member.id,
      code: props.body.code,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existed) {
    throw new HttpException("Product code already exists for this seller", 409);
  }
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const createInput = await ShoppingMallProductCollector.collect({
      body: props.body,
      seller: seller as IEntity,
    });
    const record = await prisma.shopping_mall_products.create({
      data: createInput,
      select: ShoppingMallProductTransformer.select().select,
    });
    return record;
  });
  return await ShoppingMallProductTransformer.transform(created);
}
