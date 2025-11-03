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
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberPostsPostIdReport(props: {
  communityMember: CommunitymemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityBbsReport.ICreate;
}): Promise<ICommunityBbsReport> {
  const { communityMember, postId, body } = props;

  // Business validation: ensure the request is targeting a post
  if (body.target_type !== "post")
    throw new HttpException("Invalid target_type for this endpoint", 400);
  if (body.target_id !== postId)
    throw new HttpException("target_id must match path parameter postId", 400);

  // Verify target post exists. Allow reporting of soft-deleted posts for audit.
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);

  // Basic automated triage rule (business logic): escalate specific reasons
  const priority =
    body.reason_code === "illegal" || body.reason_code === "copyright"
      ? "high"
      : "low";

  // Prepare timestamps (string & tags.Format<'date-time'>)
  const now = toISOStringSafe(new Date());

  // Create report record. All fields defined inline to produce clear type errors if schema mismatches occur.
  const created = await MyGlobal.prisma.community_bbs_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reporter_id: communityMember.id,
      target_type: "post",
      target_id: postId,
      reason_code: body.reason_code,
      explanation: body.explanation ?? null,
      evidence_count: 0,
      priority,
      status: "open",
      handled_by_actor_type: null,
      handled_by_actor_id: null,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    },
  });

  // Map Prisma result to API DTO, converting Date -> ISO strings where needed
  return {
    id: created.id as string & tags.Format<"uuid">,
    reporter_id: created.reporter_id === null ? null : created.reporter_id,
    target_type: "post",
    target_id: created.target_id as string & tags.Format<"uuid">,
    reason_code: created.reason_code as
      | "spam"
      | "harassment"
      | "copyright"
      | "illegal"
      | "other",
    explanation: created.explanation ?? null,
    evidence_count: created.evidence_count,
    priority: typia.assert<"low" | "medium" | "high" | "critical">(
      created.priority,
    ),
    status: typia.assert<"open" | "in_review" | "resolved" | "dismissed">(
      created.status,
    ),
    handled_by_actor_type:
      created.handled_by_actor_type === null ||
      created.handled_by_actor_type === undefined
        ? null
        : typia.assert<"community_moderator" | "system_admin" | "automation">(
            created.handled_by_actor_type,
          ),
    handled_by_actor_id: created.handled_by_actor_id ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : null,
  };
}
