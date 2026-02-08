import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin & {
    email: string;
    password: string;
    ip?: string | null;
    href?: string | null;
    referrer?: string | null;
  };
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (!seller) throw new HttpException("Invalid credentials", 401);
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!passwordValid) throw new HttpException("Invalid credentials", 401);
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller_id: seller.id,
      ip: props.body.ip ?? "",
      href: props.body.href ?? "",
      referrer: props.body.referrer ?? "",
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });
  const nowIso = toISOStringSafe(new Date());
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    ...seller,
    token,
  };
}
