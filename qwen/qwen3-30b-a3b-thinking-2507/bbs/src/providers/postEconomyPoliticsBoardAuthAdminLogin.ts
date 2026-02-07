import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardAdminTransformer } from "../transformers/EconomyPoliticsBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardAuthAdminLogin(props: {
  body: IEconomyPoliticsBoardAdmin.ILogin;
}): Promise<IEconomyPoliticsBoardAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.economy_politics_board_admins.findFirst({
    where: { email: props.body.email },
    select: {
      ...EconomyPoliticsBoardAdminTransformer.select().select,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Admin not found", 404);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  if (admin.deleted_at !== null) {
    throw new HttpException("Account is disabled", 403);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economy_politics_board_admin_sessions.create({
      data: {
        id: v4(),
        economy_politics_board_admin_id: admin.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
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
    ...(await EconomyPoliticsBoardAdminTransformer.transform(admin)),
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
    token,
  } satisfies IEconomyPoliticsBoardAdmin.IAuthorized;
}
