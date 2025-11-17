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

export async function postAuthCitizenJoin(props: {
  body: IEconomicBoardCitizen.ICreate;
}): Promise<IEconomicBoardCitizen.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.economic_board_citizens.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Create citizen actor
  const citizen = await MyGlobal.prisma.economic_board_citizens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      status: "active",
      deleted_at: null,
    },
  });

  // Create citizen session
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.economic_board_citizen_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_board_citizen_id: citizen.id,
      ip: props.body.ip ?? "", // Fixed: Use empty string as default when ip is null or undefined
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens with correct ISO datetime format
  const token = {
    access: jwt.sign(
      {
        type: "citizen",
        id: citizen.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "citizen",
        id: citizen.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: citizen.id,
    token,
  } satisfies IEconomicBoardCitizen.IAuthorized;
}
