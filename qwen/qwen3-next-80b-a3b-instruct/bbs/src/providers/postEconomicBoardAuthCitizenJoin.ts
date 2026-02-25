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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEconomicBoardAuthCitizenJoin(props: {
  body: IEconomicBoardCitizen.IJoin;
}): Promise<IEconomicBoardCitizen.IAuthorized> {
  // 1. Check for existing email
  const existing = await MyGlobal.prisma.economic_board_citizens.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create citizen record - await password hash generation
  const password_hash = await PasswordUtil.hash(props.body.password);
  const citizen = await MyGlobal.prisma.economic_board_citizens.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash,
      display_name: props.body.display_name ?? null,
      bio: props.body.bio ?? null,
      is_banned: false,
      ban_reason: null,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // 3. Create session record - use correct field name 'expired_at'
  const accessExpires = new Date(Date.now() + 20 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const access_token = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: v4(),
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "20m",
      issuer: "autobe",
    },
  );
  const refresh_token = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: v4(),
      tokenType: "refresh",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "14d",
      issuer: "autobe",
    },
  );
  const session = await MyGlobal.prisma.economic_board_citizen_sessions.create({
    data: {
      id: v4(),
      citizen_id: citizen.id,
      access_token,
      refresh_token: await PasswordUtil.hash(refresh_token),
      device_fingerprint: "",
      ip: "",
      href: "",
      referrer: "",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  });
  // 4. Return IAuthorized response with proper date-time strings
  return {
    id: citizen.id,
    email: citizen.email,
    display_name: citizen.display_name,
    bio: citizen.bio,
    is_banned: citizen.is_banned,
    ban_reason: citizen.ban_reason,
    created_at: citizen.created_at as string & tags.Format<"date-time">,
    updated_at: citizen.updated_at as string & tags.Format<"date-time">,
    article_count: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    comment_count: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    role: "citizen" satisfies "citizen",
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  } satisfies IEconomicBoardCitizen.IAuthorized;
}
