import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberMemberActivity(props: {
  member: MemberPayload;
}): Promise<IDiscussionBoardMemberSession.ISummary> {
  // Fetch all ban records for this member, sorted by banned_at descending
  const banRecordsData =
    await MyGlobal.prisma.discussion_board_ban_records.findMany({
      where: {
        discussion_board_member_id: props.member.id,
      },
      orderBy: {
        banned_at: "desc",
      },
    });
  // Fetch all administrator requests submitted by this member, sorted by submitted_at descending
  const administratorRequestsData =
    await MyGlobal.prisma.discussion_board_administrator_requests.findMany({
      where: {
        submitter_member_id: props.member.id,
      },
      orderBy: {
        submitted_at: "desc",
      },
    });
  // Fetch all session activity for this member, sorted by created_at descending
  const sessionActivityData =
    await MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: {
        discussion_board_member_id: props.member.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  // Transform ban records
  const banRecords = banRecordsData.map((ban) => ({
    id: ban.id as string & tags.Format<"uuid">,
    user: {
      id: ban.discussion_board_member_id as string & tags.Format<"uuid">,
      display_name: "",
      bio: null,
    } satisfies IDiscussionBoardMember.ISummary,
    administrator: {
      id: ban.administrator_id || "",
      display_name: "",
      role: "admin" as const,
    } satisfies IDiscussionBoardAdmin.ISummary,
    ban_reason: ban.ban_reason,
    banned_at: toISOStringSafe(ban.banned_at),
    unbanned_at: ban.unbanned_at ? toISOStringSafe(ban.unbanned_at) : null,
  }));
  // Transform session activity - each element must be ISummary structure
  const sessionActivity = sessionActivityData.map(
    (session) =>
      ({
        banRecords: [],
        administratorRequests: [],
        sessionActivity: [],
      }) satisfies IDiscussionBoardMemberSession.ISummary,
  );
  // Transform administrator requests
  const administratorRequests = administratorRequestsData.map((req) => ({
    status: req.status,
    submitted_at: toISOStringSafe(req.submitted_at),
    rejection_reason: req.rejection_reason,
  }));
  return {
    banRecords,
    administratorRequests,
    sessionActivity,
  };
}
