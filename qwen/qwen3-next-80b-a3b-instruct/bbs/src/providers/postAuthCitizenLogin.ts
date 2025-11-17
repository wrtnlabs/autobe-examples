import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postAuthCitizenLogin(props: {
  body: IEconomicBoardCitizen.ILogin;
  ip: string;
  href: string;
  referrer: string;
}): Promise<IEconomicBoardCitizen.IAuthorized> {
  const citizen = await MyGlobal.prisma.economic_board_citizens.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });

  if (!citizen) {
    throw new HttpException("Invalid credentials", 401);
  }

  if (citizen.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  const isValid = await PasswordUtil.verify(
    props.body.password,
    citizen.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.economic_board_citizen_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_board_citizen_id: citizen.id,
      ip: props.ip ?? "",
      href: props.href ?? "",
      referrer: props.referrer ?? "",
      created_at: new Date().toISOString(),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  await MyGlobal.prisma.economic_board_citizens.update({
    where: { id: citizen.id },
    data: { updated_at: toISOStringSafe(new Date()) },
  });

  const accessToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: citizen.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IEconomicBoardCitizen.IAuthorized;
}
