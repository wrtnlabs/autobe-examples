import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallMemberTransformer } from "../transformers/ShoppingMallMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthMemberJoin(props: {
  ip: string;
  body: IShoppingMallMember.IJoin;
}): Promise<IShoppingMallMember.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const memberId = typia.assert<string & tags.Format<"uuid">>(v4());
  const now = new Date();
  const member = await MyGlobal.prisma.shopping_mall_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  const session = await MyGlobal.prisma.shopping_mall_member_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_member_id: memberId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: "",
      refresh_token: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const tokenPayload = {
    type: "member" as const,
    id: memberId,
    session_id: sessionId,
    created_at: now.toISOString(),
  };
  const token = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        tokenType: "refresh" as const,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: typia.assert<string & tags.Format<"date-time">>(
      accessExpires.toISOString(),
    ),
    refreshable_until: typia.assert<string & tags.Format<"date-time">>(
      refreshExpires.toISOString(),
    ),
  };
  await MyGlobal.prisma.shopping_mall_member_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
    },
  });
  const memberWithRelations =
    await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
      where: { id: memberId },
      ...ShoppingMallMemberTransformer.select(),
    });
  const transformed =
    await ShoppingMallMemberTransformer.transform(memberWithRelations);
  return {
    ...transformed,
    token,
  } satisfies IShoppingMallMember.IAuthorized;
}
