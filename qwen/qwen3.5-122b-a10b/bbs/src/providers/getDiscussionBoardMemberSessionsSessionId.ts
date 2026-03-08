import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminAtSummaryTransformer } from "../transformers/DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardGuestAtSummaryTransformer } from "../transformers/DiscussionBoardGuestAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberSession> {
  // Query all three session tables to find the matching session
  const [adminSession, memberSession, guestSession] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_sessions.findUnique({
      where: { id: props.sessionId },
    }),
    MyGlobal.prisma.discussion_board_member_sessions.findUnique({
      where: { id: props.sessionId },
    }),
    MyGlobal.prisma.discussion_board_guest_sessions.findUnique({
      where: { id: props.sessionId },
    }),
  ]);
  // Determine which session type this is
  if (adminSession) {
    const admin =
      await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
        where: { id: adminSession.discussion_board_admin_id },
        select: DiscussionBoardAdminAtSummaryTransformer.select().select,
      });
    return {
      sessionType: "admin",
      id: adminSession.id,
      ip: adminSession.ip,
      href: adminSession.href,
      referrer: adminSession.referrer ?? null,
      created_at: toISOStringSafe(adminSession.created_at),
      updated_at: undefined,
      expired_at: toISOStringSafe(adminSession.expired_at),
      admin: await DiscussionBoardAdminAtSummaryTransformer.transform(admin),
      member: null,
      guest: null,
    } satisfies IDiscussionBoardMemberSession;
  }
  if (memberSession) {
    const member =
      await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
        where: { id: memberSession.discussion_board_member_id },
        select: DiscussionBoardMemberAtSummaryTransformer.select().select,
      });
    return {
      sessionType: "member",
      id: memberSession.id,
      ip: memberSession.ip,
      href: memberSession.href,
      referrer: memberSession.referrer ?? null,
      created_at: toISOStringSafe(memberSession.created_at),
      updated_at: memberSession.updated_at
        ? toISOStringSafe(memberSession.updated_at)
        : undefined,
      expired_at: toISOStringSafe(memberSession.expired_at),
      admin: null,
      member: await DiscussionBoardMemberAtSummaryTransformer.transform(member),
      guest: null,
    } satisfies IDiscussionBoardMemberSession;
  }
  if (guestSession) {
    const guest =
      await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow({
        where: { id: guestSession.discussion_board_guest_id },
        select: DiscussionBoardGuestAtSummaryTransformer.select().select,
      });
    return {
      sessionType: "guest",
      id: guestSession.id,
      ip: guestSession.ip,
      href: guestSession.href,
      referrer: guestSession.referrer ?? null,
      created_at: toISOStringSafe(guestSession.created_at),
      updated_at: undefined,
      expired_at: toISOStringSafe(guestSession.expired_at),
      admin: null,
      member: null,
      guest: await DiscussionBoardGuestAtSummaryTransformer.transform(guest),
    } satisfies IDiscussionBoardMemberSession;
  }
  // Session not found in any table
  throw new HttpException("Session not found", 404);
}
