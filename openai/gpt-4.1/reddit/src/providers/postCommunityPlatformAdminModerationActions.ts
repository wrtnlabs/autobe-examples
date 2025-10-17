import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminModerationActions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationAction.ICreate;
}): Promise<ICommunityPlatformModerationAction> {
  if (props.body.actor_id !== props.admin.id) {
    throw new HttpException("actor_id must match your own admin account", 403);
  }
  const hasTargetPost =
    props.body.target_post_id !== undefined &&
    props.body.target_post_id !== null;
  const hasTargetComment =
    props.body.target_comment_id !== undefined &&
    props.body.target_comment_id !== null;
  if (!hasTargetPost && !hasTargetComment) {
    throw new HttpException(
      "Must specify either target_post_id or target_comment_id",
      400,
    );
  }
  if (hasTargetPost && hasTargetComment) {
    throw new HttpException(
      "Cannot specify both target_post_id and target_comment_id",
      400,
    );
  }
  if (hasTargetPost) {
    const post = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: { id: props.body.target_post_id ?? undefined, deleted_at: null },
    });
    if (!post) {
      throw new HttpException("Target post does not exist or is deleted", 404);
    }
  }
  if (hasTargetComment) {
    const comment = await MyGlobal.prisma.community_platform_comments.findFirst(
      {
        where: {
          id: props.body.target_comment_id ?? undefined,
          deleted_at: null,
        },
      },
    );
    if (!comment) {
      throw new HttpException(
        "Target comment does not exist or is deleted",
        404,
      );
    }
  }
  if (props.body.report_id !== undefined && props.body.report_id !== null) {
    const report = await MyGlobal.prisma.community_platform_reports.findFirst({
      where: { id: props.body.report_id ?? undefined },
    });
    if (!report) {
      throw new HttpException("Referenced report does not exist", 404);
    }
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_moderation_actions.create({
      data: {
        id: v4(),
        actor_id: props.body.actor_id,
        target_post_id: hasTargetPost ? props.body.target_post_id : null,
        target_comment_id: hasTargetComment
          ? props.body.target_comment_id
          : null,
        report_id:
          props.body.report_id !== undefined ? props.body.report_id : null,
        action_type: props.body.action_type,
        description:
          props.body.description !== undefined ? props.body.description : null,
        created_at: now,
      },
    });
  return {
    id: created.id,
    actor_id: created.actor_id,
    target_post_id: created.target_post_id ?? undefined,
    target_comment_id: created.target_comment_id ?? undefined,
    report_id: created.report_id ?? undefined,
    action_type: created.action_type,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
  };
}
