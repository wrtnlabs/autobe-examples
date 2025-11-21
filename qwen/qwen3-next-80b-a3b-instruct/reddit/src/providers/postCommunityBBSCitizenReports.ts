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

export async function postCommunityBBSCitizenReports(props: {
  citizen: CitizenPayload;
  body: ICommunityBBSReport.ICreate;
}): Promise<ICommunityBBSReport> {
  const { targeted_entity_type, target_id, report_reason_id, comment } =
    props.body;

  // Validate target type is either 'post' or 'comment'
  if (targeted_entity_type !== "post" && targeted_entity_type !== "comment") {
    throw new HttpException(
      'Invalid targeted_entity_type. Must be either "post" or "comment".',
      400,
    );
  }

  // Validate report reason exists
  const reason = await MyGlobal.prisma.community_bbs_report_reasons.findUnique({
    where: { id: report_reason_id },
  });

  if (!reason) {
    throw new HttpException("Invalid report_reason_id. Reason not found.", 400);
  }

  // Validate target content exists and is not deleted
  let target: any;
  if (targeted_entity_type === "post") {
    target = await MyGlobal.prisma.community_bbs_posts.findUnique({
      where: { id: target_id, deleted_at: null },
    });
  } else {
    target = await MyGlobal.prisma.community_bbs_comments.findUnique({
      where: { id: target_id, deleted_at: null },
    });
  }

  if (!target) {
    throw new HttpException(
      "Target content not found or has been deleted.",
      404,
    );
  }

  // Check for duplicate report from same citizen on same target within 5 minutes
  const now = new Date();
  const fiveMinutesAgo = toISOStringSafe(
    new Date(now.getTime() - 5 * 60 * 1000),
  );
  const whereClause: any = {
    actor_type: "citizen",
    targeted_entity_type,
    created_at: { gte: fiveMinutesAgo },
  };

  if (targeted_entity_type === "post") {
    whereClause.community_bbs_post_id = target_id;
  } else {
    whereClause.community_bbs_comment_id = target_id;
  }

  const existingReport = await MyGlobal.prisma.community_bbs_reports.findFirst({
    where: whereClause,
  });

  if (existingReport) {
    throw new HttpException(
      "You have already reported this content recently.",
      429,
    );
  }

  // Create report
  const nowISOString = toISOStringSafe(now);
  const data: any = {
    actor_type: "citizen",
    targeted_entity_type,
    report_reason_id,
    comment: comment || null,
    status: "pending",
    review_status: "unreviewed",
    created_at: nowISOString,
    updated_at: nowISOString,
  };

  if (targeted_entity_type === "post") {
    data.community_bbs_post_id = target_id;
  } else {
    data.community_bbs_comment_id = target_id;
  }

  const report = await MyGlobal.prisma.community_bbs_reports.create({
    data,
  });

  return {
    actor_type: report.actor_type,
    targeted_entity_type: report.targeted_entity_type,
    target_id: target_id,
    report_reason_id: report.report_reason_id,
    status: report.status || undefined,
    review_status: report.review_status || undefined,
    comment: report.comment || undefined,
    created_at: report.created_at.toISOString(),
    updated_at: report.updated_at.toISOString(),
  };
}
