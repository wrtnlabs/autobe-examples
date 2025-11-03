import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerationAction";
import { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberModerationCommentsCommentIdActions(props: {
  communityMember: CommunitymemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityBbsModerationAction.ICreate;
}): Promise<ICommunityBbsModerationAction> {
  const { communityMember, commentId, body } = props;

  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      community_bbs_community_id: true,
      is_removed: true,
      removed_reason: true,
    },
  });

  if (!comment) throw new HttpException("Comment not found", 404);

  if (body.origin_report_id !== undefined && body.origin_report_id !== null) {
    const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
      where: { id: body.origin_report_id },
      select: { id: true },
    });
    if (!report) throw new HttpException("Origin report not found", 400);
  }

  if (body.moderator_id === undefined || body.moderator_id === null) {
    throw new HttpException(
      "moderator_id is required for moderator callers",
      400,
    );
  }

  const moderator =
    await MyGlobal.prisma.community_bbs_community_moderators.findUnique({
      where: { id: body.moderator_id },
      select: { id: true, community_id: true, active: true },
    });
  if (
    !moderator ||
    !moderator.active ||
    moderator.community_id !== comment.community_bbs_community_id
  ) {
    throw new HttpException(
      "Unauthorized: invalid or out-of-scope moderator assignment",
      403,
    );
  }

  if (body.expires_at !== undefined && body.expires_at !== null) {
    const when = Date.parse(body.expires_at);
    if (Number.isNaN(when) || when <= Date.now()) {
      throw new HttpException(
        "expires_at must be a future ISO-8601 timestamp",
        400,
      );
    }
  }

  // Ensure we have a non-null moderatorId for use inside async callbacks.
  const moderatorId = typia.assert<string & tags.Format<"uuid">>(
    body.moderator_id!,
  );

  const actionId = v4() satisfies string & tags.Format<"uuid">;
  const auditId = v4() satisfies string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdAction = await tx.community_bbs_moderation_actions.create({
      data: {
        id: actionId,
        moderator_id: moderatorId,
        target_comment_id: commentId,
        origin_report_id: body.origin_report_id ?? null,
        action_type: body.action_type,
        reason_code: body.reason_code ?? null,
        note: body.note ?? null,
        expires_at: body.expires_at ?? null,
        created_at: now,
        updated_at: now,
      },
    });

    if (body.action_type === "remove") {
      await tx.community_bbs_comments.update({
        where: { id: commentId },
        data: {
          is_removed: true,
          removed_reason: body.reason_code ?? body.note ?? null,
          updated_at: now,
        },
      });
    }

    await tx.community_bbs_audit_logs.create({
      data: {
        id: auditId,
        target_comment_id: commentId,
        actor_type: "community_member",
        actor_id: communityMember.id,
        entity: "comment",
        action: `moderation.${body.action_type}`,
        payload: JSON.stringify({ moderation_action_id: actionId }),
        ip: null,
        created_at: now,
        updated_at: now,
      },
    });

    return createdAction;
  });

  // created.target_comment_id may be nullable in DB. Assert non-null for return type.
  const targetId = typia.assert<string & tags.Format<"uuid">>(
    created.target_comment_id!,
  );

  return {
    id: created.id,
    moderator_id: created.moderator_id,
    moderator: undefined,
    target: {
      target_type: "comment",
      target_id: targetId,
    },
    origin_report_id: created.origin_report_id ?? null,
    origin_report: undefined,
    action_type: created.action_type,
    reason_code: created.reason_code ?? null,
    note: created.note ?? null,
    expires_at: created.expires_at ? toISOStringSafe(created.expires_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
