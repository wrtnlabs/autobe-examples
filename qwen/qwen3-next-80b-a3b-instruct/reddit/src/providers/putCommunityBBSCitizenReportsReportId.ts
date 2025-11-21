import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putCommunityBBSCitizenReportsReportId(props: {
  citizen: CitizenPayload;
  reportId: string;
  body: ICommunityBBSReport.IUpdate;
}): Promise<ICommunityBBSReport> {
  // Find the existing report
  const existingReport = await MyGlobal.prisma.community_bbs_reports.findFirst({
    where: {
      id: props.reportId,
      citizen_id: props.citizen.id,
      deleted_at: null,
    },
  });

  if (!existingReport) {
    throw new HttpException("Report not found", 404);
  }

  // Validate target type
  if (!existingReport.targeted_entity_type) {
    throw new HttpException("Report has invalid target type", 400);
  }

  // Determine the correct subtype table and get target_id
  let target_id: string;
  if (existingReport.targeted_entity_type === "post") {
    const target =
      await MyGlobal.prisma.community_bbs_reported_posts.findUnique({
        where: { report_id: props.reportId },
      });
    if (!target) {
      throw new HttpException("Target post not found", 404);
    }
    target_id = target.post_id;
  } else if (existingReport.targeted_entity_type === "comment") {
    const target =
      await MyGlobal.prisma.community_bbs_reported_comments.findUnique({
        where: { report_id: props.reportId },
      });
    if (!target) {
      throw new HttpException("Target comment not found", 404);
    }
    target_id = target.comment_id;
  } else {
    throw new HttpException("Invalid targeted entity type", 400);
  }

  // body is a string, not an object - treat as plain text update
  // For this implementation, we'll assume the string body contains status and comment as a delimited string
  // This matches the string IUpdate type which represents a textual update
  const updateContent = props.body;
  const updateData: {
    status?: string;
    comment?: string | null; // Use null for nullable fields, not undefined
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Parse the string body to extract status and comment
  // For this example, we'll assume format: "[status]:[comment]" where status is optional
  const parts = updateContent.split(":");

  // If there's a status value before the first colon, use it
  if (parts.length >= 2) {
    const statusValue = parts[0].trim();
    if (statusValue === "approved" || statusValue === "rejected") {
      if (existingReport.status !== "pending") {
        throw new HttpException(
          "Status can only be updated when report is pending",
          403,
        );
      }
      updateData.status = statusValue;
    }
    // Join remaining parts as comment
    const commentValue = parts.slice(1).join(":").trim();
    if (commentValue.length > 0) {
      updateData.comment = commentValue;
    }
  } else if (parts.length === 1 && parts[0].trim().length > 0) {
    // Only a comment provided
    updateData.comment = parts[0].trim();
  }

  // Apply update to the main report table
  const updatedReport = await MyGlobal.prisma.community_bbs_reports.update({
    where: { id: props.reportId },
    data: {
      ...(updateData.status !== undefined && { status: updateData.status }),
      ...(updateData.comment !== undefined && { comment: updateData.comment }),
      updated_at: updateData.updated_at,
    },
  });

  // Return formatted result following DTO
  return {
    actor_type: updatedReport.actor_type,
    targeted_entity_type: updatedReport.targeted_entity_type,
    target_id, // This comes from correct subtype table, not direct field
    report_reason_id: updatedReport.report_reason_id,
    status: updatedReport.status ?? undefined,
    review_status: updatedReport.review_status ?? undefined,
    comment: updatedReport.comment ?? undefined,
    created_at: toISOStringSafe(updatedReport.created_at),
    updated_at: toISOStringSafe(updatedReport.updated_at),
  };
}
