import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorRefresh(props: {
  body: IEconPoliticalForumModerator.IRefresh;
}): Promise<IEconPoliticalForumModerator.IAuthorized> {
  const { body } = props;
  const { refresh_token, session_id } = body;

  // Step 1: Verify JWT signature
  let decoded: unknown;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    // Log suspicious attempt
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() satisfies string as string & tags.Format<"uuid">,
        registereduser_id: null,
        moderator_id: null,
        post_id: null,
        thread_id: null,
        report_id: null,
        moderation_case_id: null,
        action_type: "refresh_invalid_jwt",
        target_type: "session",
        target_identifier: null,
        details: "Invalid JWT presented for refresh",
        created_at: toISOStringSafe(new Date()),
        created_by_system: true,
      },
    });

    throw new HttpException("Invalid refresh token", 401);
  }

  // Step 2: Find matching session
  let session: Awaited<
    ReturnType<typeof MyGlobal.prisma.econ_political_forum_sessions.findUnique>
  > | null = null;

  if (session_id !== undefined && session_id !== null) {
    session = await MyGlobal.prisma.econ_political_forum_sessions.findUnique({
      where: { id: session_id },
      // Do NOT rely on included relations for typing here; fetch user separately
    });
  } else {
    const candidates =
      await MyGlobal.prisma.econ_political_forum_sessions.findMany({
        where: { deleted_at: null },
        // avoid include to prevent relation typing issues
      });

    for (const s of candidates) {
      if (!s.refresh_token_hash) continue;
      try {
        const ok = await PasswordUtil.verify(
          refresh_token,
          s.refresh_token_hash,
        );
        if (ok) {
          session = s;
          break;
        }
      } catch {
        // ignore verify errors
      }
    }
  }

  if (!session) {
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() satisfies string as string & tags.Format<"uuid">,
        registereduser_id: null,
        moderator_id: null,
        post_id: null,
        thread_id: null,
        report_id: null,
        moderation_case_id: null,
        action_type: "refresh_no_session",
        target_type: "session",
        target_identifier: null,
        details: "Refresh token did not match any active session",
        created_at: toISOStringSafe(new Date()),
        created_by_system: true,
      },
    });

    throw new HttpException("Invalid refresh token", 401);
  }

  // Step 3: Validate session state and associated user
  // session.expires_at may be stored as an ISO string in Prisma types; handle both string and Date
  const expiresAtMillis =
    typeof session.expires_at === "string"
      ? Date.parse(session.expires_at)
      : session.expires_at instanceof Date
        ? session.expires_at.getTime()
        : NaN;

  if (!session.expires_at || expiresAtMillis <= Date.now()) {
    throw new HttpException("Refresh token expired", 401);
  }

  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: session.registereduser_id },
    });

  if (!user) throw new HttpException("User not found", 404);
  if (user.is_banned) throw new HttpException("User is banned", 403);

  // Step 4: Generate new tokens and compute expirations
  const accessToken = jwt.sign(
    { id: user.id, type: "moderator" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshToken = jwt.sign(
    { session_id: session.id, type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 5: Rotate refresh token in DB
  const newRefreshHash = await PasswordUtil.hash(refreshToken);
  await MyGlobal.prisma.econ_political_forum_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token_hash: newRefreshHash,
      expires_at: toISOStringSafe(refreshableUntilDate),
      last_active_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Step 6: Audit log
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() satisfies string as string & tags.Format<"uuid">,
      registereduser_id: user.id,
      moderator_id: null,
      post_id: null,
      thread_id: null,
      report_id: null,
      moderation_case_id: null,
      action_type: "refresh_rotated",
      target_type: "session",
      target_identifier: session.id,
      details: "Refresh token successfully rotated",
      created_at: toISOStringSafe(new Date()),
      created_by_system: true,
    },
  });

  // Step 7: Return authorized response
  return {
    id: user.id satisfies string as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: toISOStringSafe(refreshableUntilDate),
    },
  };
}
