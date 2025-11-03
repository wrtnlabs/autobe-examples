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

export async function postCommunityBbsCommunityMemberModerationPostsPostIdActions(props: {
  communityMember: CommunitymemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityBbsModerationAction.ICreate;
}): Promise<ICommunityBbsModerationAction> {
  const { communityMember, postId, body } = props;

  const allowed = [
    "remove",
    "approve",
    "warn",
    "suspend",
    "unsuspend",
    "ban",
    "unban",
    "restore",
  ] as const;

  if (!allowed.includes(body.action_type)) {
    throw new HttpException("Bad Request: unsupported action_type", 400);
  }

  if (body.moderator_id === undefined || body.moderator_id === null) {
    throw new HttpException(
      "Bad Request: moderator_id is required for communityMember actor",
      400,
    );
  }

  if (body.expires_at !== undefined && body.expires_at !== null) {
    const expires = new Date(body.expires_at);
    const nowDate = new Date();
    if (isNaN(expires.getTime())) {
      throw new HttpException(
        "Bad Request: expires_at must be a valid date-time",
        400,
      );
    }
    if (expires.getTime() <= nowDate.getTime()) {
      throw new HttpException(
        "Bad Request: expires_at must be a future timestamp",
        400,
      );
    }
  }

  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new HttpException("Not Found: post not found", 404);

  const moderator =
    await MyGlobal.prisma.community_bbs_community_moderators.findUnique({
      where: { id: body.moderator_id },
    });
  if (!moderator)
    throw new HttpException("Forbidden: moderator assignment not found", 403);
  if (!moderator.active)
    throw new HttpException(
      "Forbidden: moderator assignment is not active",
      403,
    );
  if (moderator.community_id !== post.community_bbs_community_id)
    throw new HttpException(
      "Forbidden: moderator assignment does not belong to post's community",
      403,
    );
  if (moderator.community_member_id !== communityMember.id)
    throw new HttpException(
      "Forbidden: you are not the owner of the provided moderator assignment",
      403,
    );

  if (body.origin_report_id !== undefined && body.origin_report_id !== null) {
    const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
      where: { id: body.origin_report_id },
    });
    if (!report)
      throw new HttpException("Bad Request: origin_report_id not found", 400);
  }

  const now = toISOStringSafe(new Date());
  const moderationId = v4() as string & tags.Format<"uuid">;

  const affectsVisibility =
    body.action_type === "remove" || body.action_type === "approve";

  try {
    let createdRecord;

    if (affectsVisibility) {
      const newBusinessStatus =
        body.action_type === "remove" ? "removed" : "published";
      const newIsPublished = body.action_type === "approve";

      const [created] = await MyGlobal.prisma.$transaction([
        MyGlobal.prisma.community_bbs_moderation_actions.create({
          data: {
            id: moderationId,
            moderator_id: body.moderator_id,
            target_post_id: postId,
            origin_report_id: body.origin_report_id ?? null,
            action_type: body.action_type,
            reason_code: body.reason_code ?? null,
            note: body.note ?? null,
            expires_at: body.expires_at
              ? toISOStringSafe(body.expires_at)
              : null,
            created_at: now,
            updated_at: now,
          },
        }),
        MyGlobal.prisma.community_bbs_posts.update({
          where: { id: postId },
          data: {
            business_status: newBusinessStatus,
            is_published: newIsPublished,
            updated_at: now,
          },
        }),
        MyGlobal.prisma.community_bbs_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            target_post_id: postId,
            actor_type: "moderator",
            actor_id: moderator.community_member_id,
            entity: "post",
            action: body.action_type,
            payload: JSON.stringify({
              moderation_id: moderationId,
              moderator_assignment_id: body.moderator_id,
            }),
            created_at: now,
            updated_at: now,
          },
        }),
      ]);

      createdRecord = created;
    } else {
      const [created] = await MyGlobal.prisma.$transaction([
        MyGlobal.prisma.community_bbs_moderation_actions.create({
          data: {
            id: moderationId,
            moderator_id: body.moderator_id,
            target_post_id: postId,
            origin_report_id: body.origin_report_id ?? null,
            action_type: body.action_type,
            reason_code: body.reason_code ?? null,
            note: body.note ?? null,
            expires_at: body.expires_at
              ? toISOStringSafe(body.expires_at)
              : null,
            created_at: now,
            updated_at: now,
          },
        }),
        MyGlobal.prisma.community_bbs_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            target_post_id: postId,
            actor_type: "moderator",
            actor_id: moderator.community_member_id,
            entity: "post",
            action: body.action_type,
            payload: JSON.stringify({
              moderation_id: moderationId,
              moderator_assignment_id: body.moderator_id,
            }),
            created_at: now,
            updated_at: now,
          },
        }),
      ]);

      createdRecord = created;
    }

    return {
      id: createdRecord.id,
      moderator_id: createdRecord.moderator_id,
      moderator: undefined,
      target: {
        target_type: "post",
        target_id: postId,
      },
      origin_report_id: createdRecord.origin_report_id ?? null,
      origin_report: undefined,
      action_type: createdRecord.action_type,
      reason_code: createdRecord.reason_code ?? null,
      note: createdRecord.note ?? null,
      expires_at: createdRecord.expires_at
        ? toISOStringSafe(createdRecord.expires_at)
        : null,
      created_at: toISOStringSafe(createdRecord.created_at),
      updated_at: toISOStringSafe(createdRecord.updated_at),
    };
  } catch (e) {
    // Prisma specific errors could be handled here; fall back to generic 500
    throw new HttpException("Internal Server Error", 500);
  }
}
