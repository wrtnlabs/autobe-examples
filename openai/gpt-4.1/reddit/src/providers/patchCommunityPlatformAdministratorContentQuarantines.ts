import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";
import { IPageICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentQuarantine";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorContentQuarantines(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformContentQuarantine.IRequest;
}): Promise<IPageICommunityPlatformContentQuarantine.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;

  // Build Prisma where clause
  const startAtCondition =
    props.body.start_after !== undefined ||
    props.body.start_before !== undefined
      ? {
          start_at: {
            ...(props.body.start_after !== undefined
              ? { gte: props.body.start_after }
              : {}),
            ...(props.body.start_before !== undefined
              ? { lte: props.body.start_before }
              : {}),
          },
        }
      : {};
  const endAtCondition =
    props.body.end_after !== undefined || props.body.end_before !== undefined
      ? {
          end_at: {
            ...(props.body.end_after !== undefined
              ? { gte: props.body.end_after }
              : {}),
            ...(props.body.end_before !== undefined
              ? { lte: props.body.end_before }
              : {}),
          },
        }
      : {};
  const where = {
    ...(props.body.quarantine_type !== undefined && {
      quarantine_type: props.body.quarantine_type,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...startAtCondition,
    ...endAtCondition,
    ...(props.body.target_post_id !== undefined && {
      target_post_id: props.body.target_post_id,
    }),
    ...(props.body.target_comment_id !== undefined && {
      target_comment_id: props.body.target_comment_id,
    }),
    ...(props.body.target_community_id !== undefined && {
      target_community_id: props.body.target_community_id,
    }),
    ...(props.body.moderation_action_id !== undefined && {
      moderation_action_id: props.body.moderation_action_id,
    }),
  };

  // Query base quarantines without relations
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_content_quarantines.findMany({
      where,
      skip,
      take: limit,
      orderBy: { start_at: "desc" },
    }),
    MyGlobal.prisma.community_platform_content_quarantines.count({ where }),
  ]);

  // Batch collect all referenced ids (avoid redundant queries)
  const postIds = Array.from(
    new Set(
      records
        .map((q) => q.target_post_id)
        .filter((x) => x !== null) as string[],
    ),
  );
  const commentIds = Array.from(
    new Set(
      records
        .map((q) => q.target_comment_id)
        .filter((x) => x !== null) as string[],
    ),
  );
  const communityIds = Array.from(
    new Set(
      records
        .map((q) => q.target_community_id)
        .filter((x) => x !== null) as string[],
    ),
  );
  const moderationActionIds = Array.from(
    new Set(
      records
        .map((q) => q.moderation_action_id)
        .filter((x) => x !== null) as string[],
    ),
  );

  // Fetch reference summaries in batch
  const [posts, comments, communities, moderationActions] = await Promise.all([
    postIds.length > 0
      ? MyGlobal.prisma.community_platform_posts.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            community_id: true,
            user_id: true,
          },
        })
      : [],
    commentIds.length > 0
      ? MyGlobal.prisma.community_platform_comments.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            user_id: true,
            post_id: true,
            parent_id: true,
            created_at: true,
          },
        })
      : [],
    communityIds.length > 0
      ? MyGlobal.prisma.community_platform_communities.findMany({
          where: { id: { in: communityIds } },
          select: {
            id: true,
            name: true,
            display_title: true,
            description: true,
            visibility: true,
            image_url: true,
            status: true,
          },
        })
      : [],
    moderationActionIds.length > 0
      ? MyGlobal.prisma.community_platform_moderation_actions.findMany({
          where: { id: { in: moderationActionIds } },
          select: { id: true },
        })
      : [],
  ]);

  // Batch index for joins
  const postMap = Object.fromEntries(posts.map((p) => [p.id, p]));
  const commentMap = Object.fromEntries(comments.map((c) => [c.id, c]));
  const communityMap = Object.fromEntries(communities.map((x) => [x.id, x]));
  const moderationActionMap = Object.fromEntries(
    moderationActions.map((x) => [x.id, x]),
  );

  const data = records.map((q) => {
    // Post summary
    let target_post: ICommunityPlatformPost.ISummary | null = null;
    if (q.target_post_id && postMap[q.target_post_id]) {
      const post = postMap[q.target_post_id];
      target_post = {
        id: post.id,
        community_id: post.community_id,
        user_id: post.user_id,
      } as unknown as ICommunityPlatformPost.ISummary;
    }
    // Comment summary
    let target_comment: ICommunityPlatformComment.ISummary | null = null;
    if (q.target_comment_id && commentMap[q.target_comment_id]) {
      const comment = commentMap[q.target_comment_id];
      target_comment = {
        id: comment.id,
        user: {
          id: comment.user_id,
        } as unknown as ICommunityPlatformUser.ISummary,
        post: {
          id: comment.post_id,
          community_id: undefined as any,
          user_id: undefined as any,
        } as unknown as ICommunityPlatformPost.ISummary, // Only id available
        parent_id: comment.parent_id ?? undefined,
        created_at: toISOStringSafe(comment.created_at),
      };
    }
    // Community summary
    let target_community: ICommunityPlatformCommunity.ISummary | null = null;
    if (q.target_community_id && communityMap[q.target_community_id]) {
      const comm = communityMap[q.target_community_id];
      target_community = {
        id: comm.id,
        name: comm.name,
        display_title: comm.display_title,
        description: comm.description,
        visibility: comm.visibility,
        image_url: comm.image_url ?? undefined,
        status: comm.status,
      };
    }
    // Moderation action summary
    let moderation_action:
      | ICommunityPlatformModerationAction.ISummary
      | undefined = undefined;
    if (q.moderation_action_id && moderationActionMap[q.moderation_action_id]) {
      moderation_action = {
        id: moderationActionMap[q.moderation_action_id].id,
      };
    }
    return {
      id: q.id,
      quarantine_type: q.quarantine_type,
      status: q.status,
      start_at: toISOStringSafe(q.start_at),
      end_at:
        q.end_at !== null && q.end_at !== undefined
          ? toISOStringSafe(q.end_at)
          : null,
      target_post: target_post ?? null,
      target_comment: target_comment ?? null,
      target_community: target_community ?? null,
      moderation_action,
      created_at: toISOStringSafe(q.created_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
