import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardSuperAdminTransformer } from "../transformers/EconomyPoliticsBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardAuthSuperAdminLogin(props: {
  body: IEconomyPoliticsBoardSuperAdmin.ILogin;
}): Promise<IEconomyPoliticsBoardSuperAdmin.IAuthorized> {
  const superAdmin =
    await MyGlobal.prisma.economy_politics_board_super_admins.findFirst({
      where: { email: props.body.email },
      select: {
        ...EconomyPoliticsBoardSuperAdminTransformer.select(),
        password_hash: true,
      },
    });
  if (!superAdmin) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economy_politics_board_super_admin_sessions.create({
      data: {
        id: v4(),
        economy_politics_board_super_admins_id: superAdmin.id,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "superAdmin",
        id: superAdmin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superAdmin",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    ...(await EconomyPoliticsBoardSuperAdminTransformer.transform(superAdmin)),
    token,
  };
}
