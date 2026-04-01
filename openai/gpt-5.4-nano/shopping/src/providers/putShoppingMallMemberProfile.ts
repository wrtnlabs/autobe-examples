import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallMemberTransformer } from "../transformers/ShoppingMallMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberProfile(props: {
  member: MemberPayload;
  body: IShoppingMallMember.IUpdate;
}): Promise<IShoppingMallMember> {
  const memberId = props.member.id;
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_members.findFirst({
      where: { id: memberId, deleted_at: null },
      select: { id: true },
    });
    if (!existing) {
      throw new HttpException("You're not enrolled", 403);
    }
    const updatedAt = toISOStringSafe(new Date());
    await tx.shopping_mall_members.update({
      where: { id: memberId },
      data: {
        ...(props.body.email !== undefined && { email: props.body.email }),
        updated_at: updatedAt,
      },
    });
    const row = await tx.shopping_mall_members.findUniqueOrThrow({
      where: { id: memberId },
      ...ShoppingMallMemberTransformer.select(),
    });
    return await ShoppingMallMemberTransformer.transform(row);
  });
  return updated;
}
