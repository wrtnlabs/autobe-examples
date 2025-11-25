import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityForumUserReports(props: {
  user: UserPayload;
  body: ICommunityForumCommunityReport.ICreate;
}): Promise<ICommunityForumCommunityReport> {
  // Validate that exactly one of post_id or comment_id is provided based on actor_type
  if (props.body.actor_type === "post") {
    if (!props.body.community_forum_post_id) {
      throw new HttpException("Post ID is required when reporting a post", 400);
    }
    if (props.body.community_forum_comment_id) {
      throw new HttpException(
        "Comment ID should not be provided when reporting a post",
        400,
      );
    }
  } else if (props.body.actor_type === "comment") {
    if (!props.body.community_forum_comment_id) {
      throw new HttpException(
        "Comment ID is required when reporting a comment",
        400,
      );
    }
    if (props.body.community_forum_post_id) {
      throw new HttpException(
        "Post ID should not be provided when reporting a comment",
        400,
      );
    }
  }

  // Verify the existence of the target entity
  if (props.body.actor_type === "post" && props.body.community_forum_post_id) {
    const post = await MyGlobal.prisma.community_forum_posts.findUnique({
      where: { id: props.body.community_forum_post_id },
    });

    if (!post) {
      throw new HttpException("Post not found", 404);
    }
  } else if (
    props.body.actor_type === "comment" &&
    props.body.community_forum_comment_id
  ) {
    const comment = await MyGlobal.prisma.community_forum_comments.findUnique({
      where: { id: props.body.community_forum_comment_id },
    });

    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
  }

  // Create the report record
  const now = toISOStringSafe(new Date());
  const reportId = v4() as string & tags.Format<"uuid">;

  const report = await MyGlobal.prisma.community_forum_reports.create({
    data: {
      id: reportId,
      community_forum_user_id: props.user.id,
      community_forum_moderator_id: null,
      actor_type: props.body.actor_type,
      reason: props.body.reason,
      description: props.body.description,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create the appropriate linking record
  if (props.body.actor_type === "post" && props.body.community_forum_post_id) {
    await MyGlobal.prisma.community_forum_report_on_posts.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_report_id: reportId,
        community_forum_post_id: props.body.community_forum_post_id,
        created_at: now,
      },
    });
  } else if (
    props.body.actor_type === "comment" &&
    props.body.community_forum_comment_id
  ) {
    await MyGlobal.prisma.community_forum_report_on_comments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_report_id: reportId,
        community_forum_comment_id: props.body.community_forum_comment_id,
        created_at: now,
      },
    });
  }

  // Return the created report
  return {
    id: report.id,
    community_forum_user_id: report.community_forum_user_id,
    community_forum_moderator_id: undefined, // Since we just created it, no moderator has handled it yet
    actor_type: report.actor_type,
    reason: report.reason,
    description: report.description,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: undefined, // Since we just created it, it's not deleted
  };
}
