import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";

export async function postCommunityBbsReports(props: {
  body: ICommunityBbsReport.ICreate;
}): Promise<ICommunityBbsReport> {
  const { body } = props;

  // NOTE: props does not include authentication payload. According to API
  // contract the server should attribute reporter_id when the caller is
  // authenticated. Because this function signature has no auth actor, we
  // cannot attribute the reporter and will create the report with
  // reporter_id = null (anonymous). Update function signature to include
  // authentication payload when attribution is required.

  // Verify target existence (business logic). DTO already constrains
  // target_type values, so we only perform existence checks against the DB.
  try {
    if (body.target_type === "post") {
      const found = await MyGlobal.prisma.community_bbs_posts.findUnique({
        where: { id: body.target_id },
      });
      if (!found) throw new HttpException("Target not found", 404);
    } else if (body.target_type === "comment") {
      const found = await MyGlobal.prisma.community_bbs_comments.findUnique({
        where: { id: body.target_id },
      });
      if (!found) throw new HttpException("Target not found", 404);
    } else if (body.target_type === "community") {
      const found = await MyGlobal.prisma.community_bbs_communities.findUnique({
        where: { id: body.target_id },
      });
      if (!found) throw new HttpException("Target not found", 404);
    } else if (body.target_type === "user") {
      const found =
        await MyGlobal.prisma.community_bbs_communitymember.findUnique({
          where: { id: body.target_id },
        });
      if (!found) throw new HttpException("Target not found", 404);
    } else {
      // Defensive: DTO should prevent this, but ensure clear error if it happens
      throw new HttpException("Invalid target_type", 400);
    }

    // Prepare timestamps once
    const now = toISOStringSafe(new Date());

    // Create the report with server-managed defaults and triage metadata.
    const created = await MyGlobal.prisma.community_bbs_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reporter_id: null,
        target_type: body.target_type,
        target_id: body.target_id,
        reason_code: body.reason_code,
        explanation: body.explanation ?? null,
        evidence_count: 0,
        priority: "low",
        status: "open",
        handled_by_actor_type: null,
        handled_by_actor_id: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
      },
    });

    // Map Prisma result to API DTO, converting Date fields to ISO strings.
    return {
      id: created.id as string & tags.Format<"uuid">,
      reporter_id: created.reporter_id ?? null,
      target_type: created.target_type as
        | "post"
        | "comment"
        | "community"
        | "user",
      target_id: created.target_id as string & tags.Format<"uuid">,
      target: undefined,
      reason_code: created.reason_code as
        | "spam"
        | "harassment"
        | "copyright"
        | "illegal"
        | "other",
      explanation: created.explanation ?? null,
      evidence_count: created.evidence_count,
      // Use typia.assert at primitive property level to convert string -> literal union
      priority: typia.assert<"low" | "medium" | "high" | "critical">(
        created.priority,
      ),
      status: typia.assert<"open" | "in_review" | "resolved" | "dismissed">(
        created.status,
      ),
      handled_by_actor_type:
        created.handled_by_actor_type !== null &&
        created.handled_by_actor_type !== undefined
          ? typia.assert<"community_moderator" | "system_admin" | "automation">(
              created.handled_by_actor_type,
            )
          : null,
      handled_by_actor_id: created.handled_by_actor_id ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      resolved_at: created.resolved_at
        ? toISOStringSafe(created.resolved_at)
        : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    // Unexpected error
    throw new HttpException("Internal Server Error", 500);
  }
}
