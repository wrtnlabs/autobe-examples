import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSCitizenIRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenIRefresh";
import { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postAuthCitizenRefresh(props: {
  citizen: CitizenPayload;
  body: ICommunityBBSCitizenIRefresh;
}): Promise<ICommunityBBSCitizen.IAuthorized> {
  // Extract session_id and id from citizen payload
  const { id, session_id, type } = props.citizen;

  // Validate type is citizen
  if (type !== "citizen") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and is active
  const session =
    await MyGlobal.prisma.community_bbs_citizen_sessions.findFirst({
      where: {
        id: session_id,
        community_bbs_citizen_id: id,
      },
      include: {},
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Validate citizen account is active using community_bbs_citizen_id
  const citizen = await MyGlobal.prisma.community_bbs_citizen.findFirst({
    where: {
      id: session.community_bbs_citizen_id,
    },
  });

  if (citizen?.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Calculate expiration times as ISO strings without creating Date objects via addition
  // Use timestamp math but only construct Date once for conversion
  const nowTimestamp = Date.now();
  const accessExpiresAt = new Date(nowTimestamp + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(nowTimestamp + 7 * 24 * 60 * 60 * 1000);

  const access = jwt.sign(
    {
      type,
      id,
      session_id,
      created_at: new Date(nowTimestamp).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type,
      id,
      session_id,
      tokenType: "refresh",
      created_at: new Date(nowTimestamp).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update session expiration using toISOStringSafe on Date objects to conform
  await MyGlobal.prisma.community_bbs_citizen_sessions.update({
    where: {
      id: session_id,
    },
    data: {
      expired_at: toISOStringSafe(refreshExpiresAt),
    },
  });

  return {
    id,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
  };
}
