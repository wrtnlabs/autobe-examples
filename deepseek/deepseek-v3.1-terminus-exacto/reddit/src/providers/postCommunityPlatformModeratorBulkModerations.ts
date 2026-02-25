import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformModerationActionLogTransformer } from "../transformers/CommunityPlatformModerationActionLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorBulkModerations(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationActionLog;
}): Promise<ICommunityPlatformModerationActionLog> {
  // Validate moderator exists and is active
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: {
        id: props.moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  // Verify moderator has permissions for the target community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.moderator.id, // Fixed: changed moderator_id to user_id
        community_id: props.body.community.id,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Moderator does not have permission for this community",
      403,
    );
  }
  // Validate community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.body.community.id, deleted_at: null },
    });
  // Validate optional target entities concurrently
  const validationPromises: Promise<void>[] = [];
  if (props.body.targetUser?.id) {
    validationPromises.push(
      MyGlobal.prisma.community_platform_users
        .findUniqueOrThrow({
          where: { id: props.body.targetUser.id },
        })
        .then(() => {}),
    );
  }
  if (props.body.targetPost?.id) {
    validationPromises.push(
      MyGlobal.prisma.community_platform_posts
        .findUniqueOrThrow({
          where: {
            id: props.body.targetPost.id,
            community_id: props.body.community.id, // Ensure post belongs to same community
          },
        })
        .then(() => {}),
    );
  }
  if (props.body.targetComment?.id) {
    validationPromises.push(
      MyGlobal.prisma.community_platform_comments
        .findUniqueOrThrow({
          where: { id: props.body.targetComment.id },
        })
        .then(() => {}),
    );
  }
  if (props.body.report?.id) {
    validationPromises.push(
      MyGlobal.prisma.community_platform_moderation_audit_logs
        .findUniqueOrThrow({
          where: { id: props.body.report.id },
        })
        .then(() => {}),
    );
  }
  await Promise.all(validationPromises);
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const logId = v4() as string & tags.Format<"uuid">;
  // Validate action_type is not empty and reasonable length
  if (!props.body.action_type.trim()) {
    throw new HttpException("Action type cannot be empty", 400);
  }
  if (props.body.action_type.length > 100) {
    throw new HttpException("Action type too long", 400);
  }
  // Validate action_description is not empty
  if (!props.body.action_description.trim()) {
    throw new HttpException("Action description cannot be empty", 400);
  }
  const createdLog =
    await MyGlobal.prisma.community_platform_moderation_action_logs.create({
      data: {
        id: logId,
        moderator_id: props.moderator.id,
        community_id: props.body.community.id,
        target_user_id: props.body.targetUser?.id ?? null,
        target_post_id: props.body.targetPost?.id ?? null,
        target_comment_id: props.body.targetComment?.id ?? null,
        report_id: props.body.report?.id ?? null,
        action_type: props.body.action_type,
        action_description: props.body.action_description,
        action_details: props.body.action_details ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...CommunityPlatformModerationActionLogTransformer.select(),
    });
  return await CommunityPlatformModerationActionLogTransformer.transform(
    createdLog,
  );
}
