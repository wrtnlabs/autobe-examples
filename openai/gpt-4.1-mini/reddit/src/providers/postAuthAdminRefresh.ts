import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.IRefresh;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  const decodedUncast = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );

  if (typeof decodedUncast === "string") {
    throw new HttpException("Invalid token payload", 403);
  }

  // Type guard to ensure decodedUncast has required properties
  function isValidPayload(
    payload: unknown,
  ): payload is { type: string; id: string; session_id: string } {
    return (
      typeof payload === "object" &&
      payload != null &&
      "type" in payload &&
      typeof (payload as any).type === "string" &&
      "id" in payload &&
      typeof (payload as any).id === "string" &&
      "session_id" in payload &&
      typeof (payload as any).session_id === "string"
    );
  }

  if (!isValidPayload(decodedUncast)) {
    throw new HttpException("Invalid token payload structure", 403);
  }

  const decoded = decodedUncast;

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_admin_id: decoded.id,
      },
      include: {
        redditCommunityAdmin: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const nowISO = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISO,
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
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.reddit_community_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  const admin = session.redditCommunityAdmin;

  let userSummary;
  if (admin) {
    userSummary = await MyGlobal.prisma.reddit_community_user.findUnique({
      where: { id: admin.user_id },
      select: { id: true, email: true },
    });
  }

  return {
    id: admin.id,
    user_id: admin.user_id,
    created_at: toISOStringSafe(admin.created_at),
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    user: userSummary ?? undefined,
  };
}
