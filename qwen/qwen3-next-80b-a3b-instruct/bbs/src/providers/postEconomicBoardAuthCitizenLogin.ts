import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardAuthCitizenLogin(props: {
  body: IEconomicBoardCitizen.ILogin;
}): Promise<IEconomicBoardCitizen.IAuthorized> {
  // 1. Find citizen by email, explicitly selecting password_hash
  const citizen = await MyGlobal.prisma.economic_board_citizens.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      is_banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
    },
  });
  // 2. Validate citizen exists and is not banned
  if (!citizen) throw new HttpException("Invalid credentials", 401);
  if (citizen.is_banned) throw new HttpException("Invalid credentials", 401);
  // 3. Verify password using bcrypt
  const isValid = await PasswordUtil.verify(
    props.body.password,
    citizen.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 4. Invalidate all previous sessions for this citizen
  await MyGlobal.prisma.economic_board_citizen_sessions.updateMany({
    where: { citizen_id: citizen.id },
    data: { expired_at: toISOStringSafe(new Date()) },
  });
  // 5. Create new session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = toISOStringSafe(new Date(Date.now() + 20 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  );
  const refreshSecret = v4();
  const refreshHash = await PasswordUtil.hash(refreshSecret);
  const accessToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "20m", issuer: "autobe" },
  );
  await MyGlobal.prisma.economic_board_citizen_sessions.create({
    data: {
      id: sessionId,
      citizen_id: citizen.id,
      refresh_token: refreshHash,
      device_fingerprint: "",
      ip: "",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
      access_token: accessToken,
    },
  });
  // 6. Generate JWT token payload
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshSecret,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 7. Return IAuthorized response
  return {
    id: citizen.id,
    email: citizen.email,
    display_name: citizen.display_name,
    bio: citizen.bio,
    is_banned: citizen.is_banned,
    ban_reason: citizen.ban_reason,
    created_at: toISOStringSafe(citizen.created_at),
    updated_at: toISOStringSafe(citizen.updated_at),
    article_count: 0,
    comment_count: 0,
    role: "citizen",
    token,
  } satisfies IEconomicBoardCitizen.IAuthorized;
}
