import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardUserTransformer } from "../transformers/EconomyPoliticsBoardUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardAuthUserJoin(props: {
  body: IEconomyPoliticsBoardUser.IJoin;
}): Promise<IEconomyPoliticsBoardUser.IAuthorized> {
  const body = props.body as {
    email: string;
    password: string;
  };
  const existingUser =
    await MyGlobal.prisma.economy_politics_board_users.findFirst({
      where: { email: body.email },
    });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }
  const user = await MyGlobal.prisma.economy_politics_board_users.create({
    data: {
      id: v4(),
      email: body.email,
      password_hash: await PasswordUtil.hash(body.password),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const verificationToken = v4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.economy_politics_board_user_email_verifications.create({
    data: {
      id: v4(),
      token: verificationToken,
      expires_at: toISOStringSafe(expiresAt),
      user_id: user.id,
      status: "pending",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const accessExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economy_politics_board_user_sessions.create({
      data: {
        id: v4(),
        ip: "127.0.0.1",
        expired_at: toISOStringSafe(accessExpires),
        user_id: user.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        href: "",
        referrer: "",
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
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
    ...(await EconomyPoliticsBoardUserTransformer.transform(user)),
    token,
  };
}
