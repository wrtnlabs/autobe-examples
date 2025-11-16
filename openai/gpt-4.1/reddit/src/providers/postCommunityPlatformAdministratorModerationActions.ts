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

export async function postCommunityPlatformAdministratorModerationActions(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformModerationAction.ICreate;
}): Promise<ICommunityPlatformModerationAction> {
  // Check report existence
  const report = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: {
      id: props.body.report_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!report) {
    throw new HttpException("Report does not exist or is deleted.", 404);
  }

  // Check target post existence if given
  let postSummary = undefined;
  if (props.body.target_post_id) {
    const post = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: {
        id: props.body.target_post_id,
        deleted_at: null,
      },
      select: {
        id: true,
        community_id: true,
        user_id: true,
      },
    });
    if (!post) {
      throw new HttpException("Target post does not exist or is deleted.", 404);
    }
    postSummary = {
      id: post.id,
      community_id: post.community_id,
      user_id: post.user_id,
    };
  }

  // Check target comment existence if given
  let commentSummary = undefined;
  if (props.body.target_comment_id) {
    const comment = await MyGlobal.prisma.community_platform_comments.findFirst(
      {
        where: {
          id: props.body.target_comment_id,
          deleted_at: null,
        },
        select: {
          id: true,
          user_id: true,
          post_id: true,
          parent_id: true,
          created_at: true,
        },
      },
    );
    if (!comment) {
      throw new HttpException(
        "Target comment does not exist or is deleted.",
        404,
      );
    }
    // Build the post ISummary for the comment
    let postForComment:
      | { id: string; community_id: string; user_id: string }
      | undefined = undefined;
    if (postSummary) {
      postForComment = {
        id: comment.post_id,
        community_id: postSummary.community_id,
        user_id: postSummary.user_id,
      };
    } else {
      // fallback: retrieve from DB just for the comment's post
      const postOfComment =
        await MyGlobal.prisma.community_platform_posts.findFirst({
          where: { id: comment.post_id, deleted_at: null },
          select: { id: true, community_id: true, user_id: true },
        });
      if (postOfComment) {
        postForComment = {
          id: postOfComment.id,
          community_id: postOfComment.community_id,
          user_id: postOfComment.user_id,
        };
      } else {
        // If can't get post, can't build valid ISummary, so omit targetComment
        postForComment = undefined;
      }
    }
    if (postForComment) {
      commentSummary = {
        id: comment.id,
        user: { id: comment.user_id },
        post: postForComment,
        parent_id: comment.parent_id === null ? undefined : comment.parent_id,
        created_at: toISOStringSafe(comment.created_at),
      };
    } else {
      commentSummary = undefined;
    }
  }

  // Check target community existence if given
  let communitySummary = undefined;
  if (props.body.target_community_id) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          id: props.body.target_community_id,
          deleted_at: null,
        },
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
    if (!community) {
      throw new HttpException(
        "Target community does not exist or is deleted.",
        404,
      );
    }
    communitySummary = {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url: community.image_url === null ? undefined : community.image_url,
      status: community.status,
    };
  }

  const now = toISOStringSafe(new Date());
  let moderationAction;
  try {
    moderationAction =
      await MyGlobal.prisma.community_platform_moderation_actions.create({
        data: {
          id: v4(),
          report_id: props.body.report_id,
          target_post_id: props.body.target_post_id ?? null,
          target_comment_id: props.body.target_comment_id ?? null,
          target_community_id: props.body.target_community_id ?? null,
          action_type: props.body.action_type,
          result: props.body.result,
          status: props.body.status,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
  } catch (error) {
    throw new HttpException(
      "Failed to create moderation action: " +
        (error && (error as any).message),
      400,
    );
  }

  return {
    id: moderationAction.id,
    report: { id: moderationAction.report_id },
    targetPost: postSummary
      ? {
          id: postSummary.id,
          community_id: postSummary.community_id,
          user_id: postSummary.user_id,
        }
      : undefined,
    targetComment: commentSummary,
    targetCommunity: communitySummary,
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
