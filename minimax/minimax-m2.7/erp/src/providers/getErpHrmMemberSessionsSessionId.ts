import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmMemberSession> {
  // 1. Query member_sessions first
  const memberSession =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUnique({
      where: { id: props.sessionId },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        access_token: true,
        refresh_token: true,
        token_expired_at: true,
        created_at: true,
        expired_at: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone: true,
            created_at: true,
          },
        },
      },
    });
  if (memberSession) {
    if (memberSession.expired_at < new Date()) {
      throw new HttpException("Session expired", 401);
    }
    return {
      session_type: "member",
      id: memberSession.id,
      ip: memberSession.ip,
      href: memberSession.href,
      referrer: memberSession.referrer,
      created_at: toISOStringSafe(memberSession.created_at),
      expired_at: toISOStringSafe(memberSession.expired_at),
      access_token: memberSession.access_token,
      refresh_token: memberSession.refresh_token,
      token_expired_at: toISOStringSafe(memberSession.token_expired_at),
      member: {
        id: memberSession.member.id,
        email: memberSession.member.email,
        displayName: memberSession.member.display_name,
        avatarUri: memberSession.member.avatar_uri ?? undefined,
        phone: memberSession.member.phone ?? undefined,
        createdAt: toISOStringSafe(memberSession.member.created_at),
      },
    };
  }
  // 2. Query admin_sessions
  const adminSession = await MyGlobal.prisma.erp_hrm_admin_sessions.findUnique({
    where: { id: props.sessionId },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      admin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_uri: true,
          phone: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  if (adminSession) {
    if (adminSession.expired_at < new Date()) {
      throw new HttpException("Session expired", 401);
    }
    return {
      session_type: "admin",
      id: adminSession.id,
      ip: adminSession.ip,
      href: adminSession.href,
      referrer: adminSession.referrer,
      created_at: toISOStringSafe(adminSession.created_at),
      expired_at: toISOStringSafe(adminSession.expired_at),
      admin: {
        id: adminSession.admin.id,
        email: adminSession.admin.email,
        display_name: adminSession.admin.display_name,
        avatar_uri: adminSession.admin.avatar_uri,
        phone: adminSession.admin.phone,
        created_at: toISOStringSafe(adminSession.admin.created_at),
        updated_at: toISOStringSafe(adminSession.admin.updated_at),
      },
    };
  }
  // 3. Query guest_sessions
  const guestSession = await MyGlobal.prisma.erp_hrm_guest_sessions.findUnique({
    where: { id: props.sessionId },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      guest: {
        select: {
          id: true,
          device_identifier: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (guestSession) {
    if (guestSession.expired_at < new Date()) {
      throw new HttpException("Session expired", 401);
    }
    return {
      session_type: "guest",
      id: guestSession.id,
      ip: guestSession.ip,
      href: guestSession.href,
      referrer: guestSession.referrer,
      created_at: toISOStringSafe(guestSession.created_at),
      expired_at: toISOStringSafe(guestSession.expired_at),
      guest: {
        id: guestSession.guest.id,
        device_identifier: guestSession.guest.device_identifier,
        created_at: toISOStringSafe(guestSession.guest.created_at),
      },
    };
  }
  // 4. Session not found in any table
  throw new HttpException("Session not found", 404);
}
