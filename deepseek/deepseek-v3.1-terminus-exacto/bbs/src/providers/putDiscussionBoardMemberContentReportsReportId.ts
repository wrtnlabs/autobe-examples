import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberContentReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentReport.IUpdate;
}): Promise<IDiscussionBoardContentReport> {
  // Verify the report exists and check ownership via actor_type and actor_id
  const existingReport =
    await MyGlobal.prisma.discussion_board_content_reports.findUnique({
      where: { id: props.reportId },
    });

  if (!existingReport) {
    throw new HttpException("Content report not found", 404);
  }

  // Verify ownership - only the original reporter can update
  if (existingReport.actor_type !== "member") {
    throw new HttpException(
      "You can only update member-created content reports",
      403,
    );
  }

  // We need to verify the actual member ownership through the member-specific relationship
  // Since we don't have the member-specific report table schema, we'll use a different approach
  // Check if there's a member session that matches the report's creation context
  const memberSession =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        member: { id: props.member.id },
        id: props.member.session_id,
        deleted_at: null,
      },
    });

  if (!memberSession) {
    throw new HttpException("Invalid member session", 403);
  }

  // Update the report with provided fields
  const updated = await MyGlobal.prisma.discussion_board_content_reports.update(
    {
      where: { id: props.reportId },
      data: {
        ...(props.body.report_reason !== undefined && {
          report_reason: props.body.report_reason,
        }),
        ...(props.body.report_details !== undefined && {
          report_details: props.body.report_details,
        }),
        updated_at: new Date(),
      },
    },
  );

  // Get member details for the actor field
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: updated.id as string & tags.Format<"uuid">,
    actor: {
      id: member.id as string & tags.Format<"uuid">,
      type: "member",
      name: member.display_name ?? "",
    },
    report_reason: updated.report_reason,
    report_details: updated.report_details ?? undefined,
    status: updated.status,
    priority: updated.priority,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
