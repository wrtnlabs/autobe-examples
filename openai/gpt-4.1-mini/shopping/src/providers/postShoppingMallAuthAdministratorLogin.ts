import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdministratorLogin(props: {
  body: IShoppingMallAdministrator.ILogin;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  const email = (props.body as any).email as string | undefined;
  const password = (props.body as any).password as string | undefined;
  if (email === undefined || password === undefined)
    throw new HttpException("Invalid credentials", 401);
  const admin = await MyGlobal.prisma.shopping_mall_administrators.findFirst({
    where: { email },
    select: {
      id: true,
      password_hash: true,
      email: true,
      name: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(password, admin.password_hash);
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  const nowDate = new Date();
  const now = toISOStringSafe(nowDate);
  const accessExpires = toISOStringSafe(
    new Date(nowDate.getTime() + 60 * 60 * 1000),
  );
  const refreshExpires = toISOStringSafe(
    new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
      data: {
        id: sessionId,
        ip: "",
        href: "",
        referrer: "",
        created_at: now,
        expired_at: accessExpires,
        administrator: { connect: { id: admin.id } },
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return { token };
}
