import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCitizenRefresh(props: {
  body: IPoliticalForumCitizen.IRefresh;
}): Promise<IPoliticalForumCitizen.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "citizen";
  };

  try {
    decoded = typia.assert<{ id: string; session_id: string; type: "citizen" }>(
      jwt.verify(props.body, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "citizen") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.political_forum_citizen_sessions.findFirst({
      where: {
        id: decoded.session_id,
        political_forum_citizen_id: decoded.id,
      },
      include: {
        citizen: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.citizen.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.political_forum_citizen_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: toISOStringSafe(refreshExpires),
    },
  });

  return {
    id: session.citizen.id,
    email: session.citizen.email,
    display_name: session.citizen.display_name || "",
    email_verified: session.citizen.email_verified,
    access_token: access,
    refresh_token: refresh,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
