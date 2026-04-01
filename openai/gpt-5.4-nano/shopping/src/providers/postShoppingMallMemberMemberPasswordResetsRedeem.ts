import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallMemberPasswordResetTransformer } from "../transformers/ShoppingMallMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberMemberPasswordResetsRedeem(props: {
  member: MemberPayload;
  body: IShoppingMallMemberPasswordReset.ICreate;
}): Promise<IShoppingMallMemberPasswordReset> {
  const token = props.body.token;
  const reset =
    await MyGlobal.prisma.shopping_mall_member_password_resets.findFirst({
      where: {
        token,
        deleted_at: null,
        used_at: null,
      },
      select: {
        id: true,
        shopping_mall_member_id: true,
        expires_at: true,
        used_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
          },
        },
      },
    });
  if (reset === null) {
    throw new HttpException("Invalid password reset token", 403);
  }
  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(reset.expires_at);
  if (expiresAt <= now) {
    throw new HttpException("Invalid password reset token", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const eligible = await tx.shopping_mall_member_password_resets.findFirst({
      where: {
        token,
        deleted_at: null,
        used_at: null,
        expires_at: { gt: now },
      },
      select: {
        id: true,
        shopping_mall_member_id: true,
      },
    });
    if (eligible === null) {
      throw new HttpException("Invalid password reset token", 403);
    }
    const passwordHash = await (PasswordUtil as any).hashPassword({
      password: props.body.password,
    });
    await tx.shopping_mall_members.update({
      where: { id: eligible.shopping_mall_member_id },
      data: {
        password_hash: passwordHash,
      },
    });
    await tx.shopping_mall_member_password_resets.update({
      where: { id: eligible.id },
      data: {
        used_at: now,
      },
    });
  });
  const result =
    await MyGlobal.prisma.shopping_mall_member_password_resets.findFirstOrThrow(
      {
        where: { token },
        ...ShoppingMallMemberPasswordResetTransformer.select(),
      },
    );
  return await ShoppingMallMemberPasswordResetTransformer.transform(result);
}
