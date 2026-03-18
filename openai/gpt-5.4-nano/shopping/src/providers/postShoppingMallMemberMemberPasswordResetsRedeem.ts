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
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const nowDate = new Date(nowIso);
  const eligibleReset =
    await MyGlobal.prisma.shopping_mall_member_password_resets.findFirst({
      where: {
        token: props.body.token,
        deleted_at: null,
        used_at: null,
        expires_at: { gt: nowDate },
      },
      select: {
        id: true,
        shopping_mall_member_id: true,
      },
    });
  if (eligibleReset === null) {
    throw new HttpException("Forbidden", 403);
  }
  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      const reset = await tx.shopping_mall_member_password_resets.findFirst({
        where: {
          token: props.body.token,
          deleted_at: null,
          used_at: null,
          expires_at: { gt: nowDate },
        },
        select: {
          id: true,
          shopping_mall_member_id: true,
        },
      });
      if (reset === null) {
        throw new HttpException("Forbidden", 403);
      }
      const hashedPassword = await PasswordUtil.hash(props.body.password);
      await tx.shopping_mall_members.update({
        where: { id: reset.shopping_mall_member_id },
        data: {
          password_hash: hashedPassword,
          updated_at: nowDate,
        },
        select: { id: true },
      });
      await tx.shopping_mall_member_password_resets.update({
        where: { id: reset.id },
        data: {
          used_at: nowDate,
          updated_at: nowDate,
        },
      });
    });
  } catch {
    throw new HttpException("Forbidden", 403);
  }
  const updatedReset =
    await MyGlobal.prisma.shopping_mall_member_password_resets.findFirstOrThrow(
      {
        where: {
          token: props.body.token,
          deleted_at: null,
        },
        ...ShoppingMallMemberPasswordResetTransformer.select(),
      },
    );
  return await ShoppingMallMemberPasswordResetTransformer.transform({
    ...updatedReset,
    password: false,
    member: updatedReset.member,
  });
}
