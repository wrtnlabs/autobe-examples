import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorModerationActionsModerationActionId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationAction.IUpdate;
}): Promise<ICommunityPlatformModerationAction> {
  const action =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: { id: props.moderationActionId, deleted_at: null },
    });
  if (!action) {
    throw new HttpException(
      "Moderation action not found or has been deleted.",
      404,
    );
  }
  if (typeof props.body.target_post_id === "string") {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: props.body.target_post_id, deleted_at: null },
    });
    if (!post)
      throw new HttpException("Referenced target_post_id does not exist.", 400);
  }
  if (typeof props.body.target_comment_id === "string") {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: props.body.target_comment_id, deleted_at: null },
      });
    if (!comment)
      throw new HttpException(
        "Referenced target_comment_id does not exist.",
        400,
      );
  }
  if (typeof props.body.target_community_id === "string") {
    const community =
      await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { id: props.body.target_community_id, deleted_at: null },
      });
    if (!community)
      throw new HttpException(
        "Referenced target_community_id does not exist.",
        400,
      );
  }
  const updated =
    await MyGlobal.prisma.community_platform_moderation_actions.update({
      where: { id: props.moderationActionId },
      data: {
        ...(props.body.action_type !== undefined && {
          action_type: props.body.action_type,
        }),
        ...(props.body.result !== undefined && { result: props.body.result }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.target_post_id !== undefined && {
          target_post_id: props.body.target_post_id,
        }),
        ...(props.body.target_comment_id !== undefined && {
          target_comment_id: props.body.target_comment_id,
        }),
        ...(props.body.target_community_id !== undefined && {
          target_community_id: props.body.target_community_id,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
      include: {
        report: true,
        targetPost: { include: { community: true, user: true } },
        targetComment: {
          include: {
            user: true,
            post: { include: { community: true, user: true } },
          },
        },
        targetCommunity: true,
      },
    });
  return {
    id: updated.id,
    report: { id: updated.report_id },
    targetPost: updated.targetPost
      ? {
          id: updated.targetPost.id,
          community_id: updated.targetPost.community_id,
          user_id: updated.targetPost.user_id,
          community: updated.targetPost.community
            ? {
                id: updated.targetPost.community.id,
                name: updated.targetPost.community.name,
                display_title: updated.targetPost.community.display_title,
                description: updated.targetPost.community.description,
                visibility: updated.targetPost.community.visibility,
                image_url: updated.targetPost.community.image_url ?? undefined,
                status: updated.targetPost.community.status,
              }
            : undefined,
          user: updated.targetPost.user
            ? { id: updated.targetPost.user.id }
            : undefined,
        }
      : undefined,
    targetComment: updated.targetComment
      ? {
          id: updated.targetComment.id,
          user: { id: updated.targetComment.user.id },
          post: {
            id: updated.targetComment.post.id,
            community_id: updated.targetComment.post.community_id,
            user_id: updated.targetComment.post.user_id,
            community: updated.targetComment.post.community
              ? {
                  id: updated.targetComment.post.community.id,
                  name: updated.targetComment.post.community.name,
                  display_title:
                    updated.targetComment.post.community.display_title,
                  description: updated.targetComment.post.community.description,
                  visibility: updated.targetComment.post.community.visibility,
                  image_url:
                    updated.targetComment.post.community.image_url ?? undefined,
                  status: updated.targetComment.post.community.status,
                }
              : undefined,
            user: updated.targetComment.post.user
              ? { id: updated.targetComment.post.user.id }
              : undefined,
          },
          parent_id: updated.targetComment.parent_id ?? undefined,
          created_at: toISOStringSafe(updated.targetComment.created_at),
        }
      : undefined,
    targetCommunity: updated.targetCommunity
      ? {
          id: updated.targetCommunity.id,
          name: updated.targetCommunity.name,
          display_title: updated.targetCommunity.display_title,
          description: updated.targetCommunity.description,
          visibility: updated.targetCommunity.visibility,
          image_url: updated.targetCommunity.image_url ?? undefined,
          status: updated.targetCommunity.status,
        }
      : undefined,
    action_type: updated.action_type,
    result: updated.result,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
