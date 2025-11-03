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

export async function postCommunityBbsCommunityMemberCommentsCommentIdReport(props: {
  communityMember: CommunitymemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityBbsReport.ICreate;
}): Promise<ICommunityBbsReport> {
  const { communityMember, commentId, body } = props;

  try {
    // Verify comment exists and get community context
    const comment =
      await MyGlobal.prisma.community_bbs_comments.findUniqueOrThrow({
        where: { id: commentId },
        select: { id: true, community_bbs_community_id: true },
      });

    const community =
      await MyGlobal.prisma.community_bbs_communities.findUniqueOrThrow({
        where: { id: comment.community_bbs_community_id },
        select: { id: true, visibility: true },
      });

    // Authorization: require membership for non-public communities
    if (community.visibility !== "public") {
      const membership =
        await MyGlobal.prisma.community_bbs_community_memberships.findFirst({
          where: {
            community_id: community.id,
            community_member_id: communityMember.id,
            status: "member",
          },
        });

      if (!membership) {
        throw new HttpException(
          "Unauthorized: You cannot view or report this comment",
          403,
        );
      }
    }

    // Prepare timestamps
    const now = toISOStringSafe(new Date());

    // Create the report record
    const created = await MyGlobal.prisma.community_bbs_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reporter_id: communityMember.id,
        target_type: "comment",
        target_id: commentId,
        reason_code: body.reason_code,
        explanation: body.explanation ?? null,
        evidence_count: 0,
        priority: "medium",
        status: "open",
        handled_by_actor_type: null,
        handled_by_actor_id: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
      },
    });

    // Build response mapping with proper null/undefined handling and date conversions
    return {
      id: created.id as string & tags.Format<"uuid">,
      reporter_id:
        created.reporter_id === null
          ? null
          : (created.reporter_id as string & tags.Format<"uuid">),
      target_type: created.target_type as
        | "post"
        | "comment"
        | "community"
        | "user",
      target_id: created.target_id as string & tags.Format<"uuid">,
      reason_code: created.reason_code as
        | "spam"
        | "harassment"
        | "copyright"
        | "illegal"
        | "other",
      explanation: created.explanation ?? null,
      evidence_count: created.evidence_count,
      priority: created.priority as "low" | "medium" | "high" | "critical",
      status: created.status as "open" | "in_review" | "resolved" | "dismissed",
      handled_by_actor_type: typia.assert<
        "community_moderator" | "system_admin" | "automation" | null | undefined
      >(created.handled_by_actor_type ?? null),
      handled_by_actor_id: created.handled_by_actor_id ?? null,
      created_at: created.created_at
        ? toISOStringSafe(created.created_at)
        : (now as string & tags.Format<"date-time">),
      updated_at: created.updated_at
        ? toISOStringSafe(created.updated_at)
        : (now as string & tags.Format<"date-time">),
      resolved_at: created.resolved_at
        ? toISOStringSafe(created.resolved_at)
        : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    // Prismaclient throws errors that are unexpected - wrap as 500
    throw new HttpException("Internal Server Error", 500);
  }
}
