import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IEconomicBoardModerator.IRequest;
}): Promise<IEconomicBoardModerator.IAuthorized> {
  // Controller layer has already validated input via JSON Schema.
  // These properties exist in the request despite not being in IRequest.
  const email = (props.body as any).email;
  const password = (props.body as any).password;
  const ip = (props as any).ip;
  const href = (props as any).href;
  const referrer = (props as any).referrer;

  if (!email || !password) {
    throw new HttpException("Invalid credentials", 401);
  }

  const moderator = await MyGlobal.prisma.economic_board_moderators.findFirst({
    where: {
      email: email,
      deleted_at: null,
      status: "active",
    },
  });

  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(password, moderator.password_hash);

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.economic_board_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        economic_board_moderator_id: moderator.id,
        ip: ip ?? null,
        href: href ?? null,
        referrer: referrer ?? null,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: moderator.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
