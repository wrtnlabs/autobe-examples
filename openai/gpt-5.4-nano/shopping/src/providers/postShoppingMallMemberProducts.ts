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
  // Seller suspension / eligibility check
  await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { id: true, deleted_at: true },
  });
  const seller = await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { id: true, deleted_at: true },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("You're not enrolled", 403);
  }
  // Validate category selection (hierarchy: allow at most one-level nesting)
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_category_id },
      select: { id: true, parent_category_id: true },
    });
  if (category.parent_category_id !== null) {
    const parent =
      await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
        where: { id: category.parent_category_id },
        select: { id: true, parent_category_id: true },
      });
    if (parent.parent_category_id !== null) {
      throw new HttpException("Invalid category nesting", 400);
    }
  }
  try {
    const created = await MyGlobal.prisma.shopping_mall_products.create({
      data: await ShoppingMallProductCollector.collect({
        body: props.body,
        seller: props.member,
      }),
      ...ShoppingMallProductTransformer.select(),
    });
    return await ShoppingMallProductTransformer.transform(created);
  } catch (e: unknown) {
    const err = e as {
      code?: string;
    };
    // Prisma unique constraint violation
    if (err && (err as any).code === "P2002") {
      throw new HttpException(
        "Product code already exists for this seller",
        409,
      );
    }
    throw e;
  }
}
