import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IEconomicBoardModerator.ICreate;
}): Promise<IEconomicBoardModerator.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.economic_board_moderators.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create moderator actor
  const moderator = await MyGlobal.prisma.economic_board_moderators.create({
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

  // Create moderator session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economic_board_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        economic_board_moderator_id: moderator.id,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
        ip: "",
        href: "",
        referrer: "",
      },
    });

  // Generate JWT tokens
  const now = new Date();
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
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
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return IAuthorized response
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
