import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getCommunityPlatformAdministratorModerationActionsModerationActionId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationAction> {
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findFirst({
      where: {
        id: props.moderationActionId,
        deleted_at: null,
      },
    });
  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  const reportSummary = { id: moderationAction.report_id };

  let targetPostSummary: ICommunityPlatformPost.ISummary | null | undefined =
    undefined;
  if (moderationAction.target_post_id !== null) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: moderationAction.target_post_id },
      select: { id: true, community_id: true, user_id: true },
    });
    if (post) {
      targetPostSummary = {
        id: post.id,
        community_id: post.community_id,
        user_id: post.user_id,
        community: undefined,
        user: undefined,
      };
    } else {
      targetPostSummary = null;
    }
  }

  let targetCommentSummary:
    | ICommunityPlatformComment.ISummary
    | null
    | undefined = undefined;
  if (moderationAction.target_comment_id !== null) {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: moderationAction.target_comment_id },
        select: { id: true, user_id: true, post_id: true, created_at: true },
      });
    if (comment) {
      targetCommentSummary = {
        id: comment.id,
        user: { id: comment.user_id },
        post: {
          id: comment.post_id,
          community_id: undefined as unknown as string & tags.Format<"uuid">,
          user_id: undefined as unknown as string & tags.Format<"uuid">,
          community: undefined,
          user: undefined,
        },
        parent_id: undefined,
        created_at: toISOStringSafe(comment.created_at),
      };
    } else {
      targetCommentSummary = null;
    }
  }

  let targetCommunitySummary:
    | ICommunityPlatformCommunity.ISummary
    | null
    | undefined = undefined;
  if (moderationAction.target_community_id !== null) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findUnique({
        where: { id: moderationAction.target_community_id },
        select: {
          id: true,
          name: true,
          display_title: true,
          description: true,
          visibility: true,
          image_url: true,
          status: true,
        },
      });
    if (community) {
      targetCommunitySummary = {
        id: community.id,
        name: community.name,
        display_title: community.display_title,
        description: community.description,
        visibility: community.visibility,
        image_url:
          community.image_url === null ? undefined : community.image_url,
        status: community.status,
      };
    } else {
      targetCommunitySummary = null;
    }
  }

  return {
    id: moderationAction.id,
    report: reportSummary,
    targetPost: targetPostSummary === undefined ? undefined : targetPostSummary,
    targetComment:
      targetCommentSummary === undefined ? undefined : targetCommentSummary,
    targetCommunity:
      targetCommunitySummary === undefined ? undefined : targetCommunitySummary,
    action_type: moderationAction.action_type,
    result: moderationAction.result,
    status: moderationAction.status,
    created_at: toISOStringSafe(moderationAction.created_at),
    updated_at: toISOStringSafe(moderationAction.updated_at),
    deleted_at:
      moderationAction.deleted_at === null
        ? undefined
        : toISOStringSafe(moderationAction.deleted_at),
  };
}
