import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "../transformers/HrmTimeTrackOrganizationAtSummaryTransformer";
import { HrmTimeTrackRoleAtSummaryTransformer } from "../transformers/HrmTimeTrackRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackAuthGuestRefresh(props: {
  body: IHrmTimeTrackGuest.IRefresh;
}): Promise<IHrmTimeTrackGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    email: string;
    type: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      email: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists
  const session = await MyGlobal.prisma.hrm_time_track_guest_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  // 4. Verify session not expired
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session has expired", 400);
  }
  // 5. Query guest invitation with organization and role
  const guest = await MyGlobal.prisma.hrm_time_track_guests.findUnique({
    where: {
      id: session.hrm_time_track_guest_id,
    },
    select: {
      id: true,
      email: true,
      status: true,
      expires_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
      role: HrmTimeTrackRoleAtSummaryTransformer.select(),
    },
  });
  if (!guest) {
    throw new HttpException("Guest invitation not found", 404);
  }
  // 6. Verify invitation not deleted
  if (guest.deleted_at !== null) {
    throw new HttpException("Invitation has been deleted", 400);
  }
  // 7. Verify invitation status is valid
  if (guest.status !== "pending" && guest.status !== "accepted") {
    throw new HttpException("Invitation is not valid", 400);
  }
  // 8. Verify invitation not expired
  if (guest.expires_at < now) {
    throw new HttpException("Invitation has expired", 400);
  }
  // 9. Update session expiration (extend by 7 days)
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.hrm_time_track_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 10. Generate new tokens
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        email: decoded.email,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        email: decoded.email,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 11. Return IAuthorized response
  return {
    id: guest.id,
    email: guest.email,
    status: guest.status,
    expires_at: toISOStringSafe(guest.expires_at),
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: toISOStringSafe(guest.deleted_at!),
    organization: await HrmTimeTrackOrganizationAtSummaryTransformer.transform(
      guest.organization,
    ),
    role: await HrmTimeTrackRoleAtSummaryTransformer.transform(guest.role),
    token: token,
  };
}
