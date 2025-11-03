import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberPostsPostIdComments(props: {
  communityMember: CommunitymemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityBbsComment.ICreate;
}): Promise<ICommunityBbsComment> {
  const { communityMember, postId, body } = props;

  // Verify actor account exists and is allowed to act
  const actor =
    await MyGlobal.prisma.community_bbs_communitymember.findUniqueOrThrow({
      where: { id: communityMember.id },
    });
  if (
    actor.status === "deleted_soft" ||
    actor.status === "banned" ||
    actor.status === "suspended"
  )
    throw new HttpException("Forbidden: account status", 403);

  // Fetch the target post and its community for visibility checks
  const post = await MyGlobal.prisma.community_bbs_posts.findUniqueOrThrow({
    where: { id: postId },
    include: { community: true },
  });

  // Visibility enforcement: only members may comment in non-public communities
  if (post.community.visibility !== "public") {
    const membership =
      await MyGlobal.prisma.community_bbs_community_memberships.findFirst({
        where: {
          community_id: post.community_bbs_community_id,
          community_member_id: communityMember.id,
          status: "member",
        },
      });
    if (!membership)
      throw new HttpException("Forbidden: not a community member", 403);
  }

  // Parent comment must exist and belong to the same post when provided
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await MyGlobal.prisma.community_bbs_comments.findFirst({
      where: {
        id: body.parent_id,
        community_bbs_post_id: postId,
        deleted_at: null,
      },
    });
    if (!parent) throw new HttpException("Parent comment not found", 404);
  }

  // Rate limit: simple per-minute threshold
  const oneMinuteAgo = toISOStringSafe(new Date(Date.now() - 60_000));
  const recentCount = await MyGlobal.prisma.community_bbs_comments.count({
    where: {
      community_bbs_communitymember_id: communityMember.id,
      created_at: { gte: oneMinuteAgo },
    },
  });
  const RATE_LIMIT_PER_MINUTE = 5;
  if (recentCount >= RATE_LIMIT_PER_MINUTE)
    throw new HttpException("Too Many Requests", 429);

  // Business validation: enforce comment length
  if (
    typeof body.body !== "string" ||
    body.body.length === 0 ||
    body.body.length > 10000
  )
    throw new HttpException("Bad Request: invalid comment body length", 400);

  // Sanitization: remove script blocks and trim
  const sanitized = body.body
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .trim();

  // Timestamp for db fields
  const now = toISOStringSafe(new Date());

  // Create the comment row
  const created = await MyGlobal.prisma.community_bbs_comments.create({
    data: {
      id: v4(),
      community_bbs_post_id: postId,
      community_bbs_community_id: post.community_bbs_community_id,
      community_bbs_communitymember_id: communityMember.id,
      community_bbs_parent_id: body.parent_id ?? null,
      body: sanitized,
      is_removed: false,
      removed_reason: null,
      score: 0,
      upvotes: 0,
      downvotes: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Increment the post's cached comment_count
  await MyGlobal.prisma.community_bbs_posts.update({
    where: { id: postId },
    data: {
      comment_count: (post.comment_count ?? 0) + 1,
      updated_at: now,
    },
  });

  // Create an append-only snapshot for the comment
  await MyGlobal.prisma.community_bbs_comment_snapshots.create({
    data: {
      id: v4(),
      community_bbs_comment_id: created.id,
      body: sanitized,
      score: created.score,
      upvotes: created.upvotes,
      downvotes: created.downvotes,
      snapshot_at: now,
      created_at: now,
      updated_at: now,
    },
  });

  // Emit in-app notification to the post author (skip self-notification)
  if (post.community_bbs_communitymember_id !== communityMember.id) {
    await MyGlobal.prisma.community_bbs_notifications.create({
      data: {
        id: v4(),
        recipient_id: post.community_bbs_communitymember_id,
        actor_id: communityMember.id,
        target_type: "post",
        target_id: postId,
        notification_key: v4(),
        notification_type: "reply",
        channel: "in_app",
        priority: "medium",
        status: "pending",
        attempts: 0,
        last_attempt_at: null,
        delivered_at: null,
        scheduled_at: null,
        body: sanitized.substring(0, 256),
        payload_uri: null,
        delivery_result: null,
        suppressed: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  // Audit record for traceability
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4(),
      target_post_id: postId,
      target_comment_id: created.id,
      target_community_id: post.community_bbs_community_id,
      target_user_id: communityMember.id,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "comment",
      action: "created",
      payload: JSON.stringify({ comment_id: created.id, post_id: postId }),
      ip: null,
      created_at: now,
      updated_at: now,
    },
  });

  // Build response: fetch community summary and author summary for return
  const community =
    await MyGlobal.prisma.community_bbs_communities.findUniqueOrThrow({
      where: { id: post.community_bbs_community_id },
      include: { creator: true, community_bbs_community_settings: true },
    });

  const author =
    await MyGlobal.prisma.community_bbs_communitymember.findUniqueOrThrow({
      where: { id: created.community_bbs_communitymember_id },
    });

  return {
    id: created.id,
    community_bbs_post_id: created.community_bbs_post_id,
    community: {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      creator: {
        id: community.creator.id,
        username: community.creator.username,
        display_name: community.creator.display_name,
        karma: community.creator.karma,
        created_at: toISOStringSafe(community.creator.created_at),
        updated_at: toISOStringSafe(community.creator.updated_at),
      },
      visibility: typia.assert<"public" | "restricted" | "private">(
        community.visibility,
      ),
      post_approval_required: community.post_approval_required,
      members_count: community.members_count,
      posts_count: community.posts_count,
      community_settings: community.community_bbs_community_settings
        ? {
            id: community.community_bbs_community_settings.id,
            community_id:
              community.community_bbs_community_settings.community_id,
            visibility: typia.assert<"public" | "restricted" | "private">(
              community.community_bbs_community_settings.visibility,
            ),
            require_post_approval:
              community.community_bbs_community_settings.require_post_approval,
            max_images_per_post:
              community.community_bbs_community_settings.max_images_per_post,
            allowed_image_mime_types: community.community_bbs_community_settings
              .allowed_image_mime_types
              ? community.community_bbs_community_settings.allowed_image_mime_types.split(
                  ",",
                )
              : undefined,
            created_at: toISOStringSafe(
              community.community_bbs_community_settings.created_at,
            ),
            updated_at: toISOStringSafe(
              community.community_bbs_community_settings.updated_at,
            ),
            deleted_at: community.community_bbs_community_settings.deleted_at
              ? toISOStringSafe(
                  community.community_bbs_community_settings.deleted_at,
                )
              : null,
          }
        : undefined,
      created_at: toISOStringSafe(community.created_at),
      updated_at: toISOStringSafe(community.updated_at),
      deleted_at: community.deleted_at
        ? toISOStringSafe(community.deleted_at)
        : null,
    },
    author: {
      id: author.id,
      username: author.username,
      display_name: author.display_name,
      karma: author.karma,
      created_at: toISOStringSafe(author.created_at),
      updated_at: toISOStringSafe(author.updated_at),
    },
    parent_id: created.community_bbs_parent_id ?? null,
    body: created.body,
    is_removed: created.is_removed,
    removed_reason: created.removed_reason,
    score: created.score,
    upvotes: created.upvotes,
    downvotes: created.downvotes,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
