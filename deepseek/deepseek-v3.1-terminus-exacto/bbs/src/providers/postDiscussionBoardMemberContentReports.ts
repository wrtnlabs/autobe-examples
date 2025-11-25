import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberContentReports(props: {
  member: MemberPayload;
  body: IDiscussionBoardContentReport.ICreate;
}): Promise<IDiscussionBoardContentReport> {
  try {
    // Create the content report with automatic member actor type
    const created =
      await MyGlobal.prisma.discussion_board_content_reports.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_type: "member",
          report_reason: props.body.report_reason,
          report_details: props.body.report_details ?? null,
          status: "pending",
          priority: props.body.priority,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
      });

    // Build actor summary from member payload
    // Note: In a real implementation, we would fetch member details for the name
    const actor: IDiscussionBoardMember.ISummary = {
      id: props.member.id,
      type: "member",
      name: `Member ${props.member.id.substring(0, 8)}`, // Placeholder until member name lookup is available
    };

    return {
      id: created.id,
      actor,
      report_reason: created.report_reason,
      report_details:
        created.report_details === null ? undefined : created.report_details,
      status: created.status,
      priority: created.priority,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? undefined
          : toISOStringSafe(created.deleted_at),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException("Failed to create content report", 500);
    }
    throw error;
  }
}
