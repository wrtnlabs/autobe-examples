import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthMemberJoin(props: {
  ip: string;
  body: IShoppingMallMember.IJoin;
}): Promise<IShoppingMallMember.IAuthorized> {
  const createdAt = toISOStringSafe(new Date());
  const updatedAt = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_members.findFirst({
      where: { email: props.body.email, deleted_at: null },
      select: { id: true },
    });
    if (existing) throw new HttpException("Email already registered", 409);
    const member = await tx.shopping_mall_members.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        created_at: createdAt,
        updated_at: updatedAt,
        deleted_at: null,
      },
    });
    const session = await tx.shopping_mall_member_sessions.create({
      data: {
        id: v4(),
        shopping_mall_member_id: member.id,
        ip: props.ip,
        href: props.body.email,
        referrer: props.ip,
        created_at: createdAt,
        expired_at: expiredAt,
      },
    });
    const token: IAuthorizationToken = {
      access: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: session.id,
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    };
    return {
      id: member.id,
      email: member.email,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
      token,
    } satisfies IShoppingMallMember.IAuthorized;
  });
}
