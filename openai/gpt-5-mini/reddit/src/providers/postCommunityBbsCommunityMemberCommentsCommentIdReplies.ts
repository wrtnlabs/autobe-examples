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

export async function postCommunityBbsCommunityMemberCommentsCommentIdReplies(props: {
  communityMember: CommunitymemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityBbsComment.ICreate;
}): Promise<ICommunityBbsComment> {
  const { communityMember, commentId, body } = props;

  // Load parent comment with necessary relations (include community settings)
  const parent = await MyGlobal.prisma.community_bbs_comments.findUniqueOrThrow(
    {
      where: { id: commentId },
      include: {
        post: true,
        community: {
          include: { creator: true, community_bbs_community_settings: true },
        },
        author: true,
      },
    },
  );

  if (parent.deleted_at !== null) {
    throw new HttpException(
      "Parent comment not found or has been deleted",
      404,
    );
  }

  const member =
    await MyGlobal.prisma.community_bbs_communitymember.findUniqueOrThrow({
      where: { id: communityMember.id },
    });

  if (
    member.deleted_at !== null ||
    member.status === "banned" ||
    member.status === "deleted_soft" ||
    member.status === "suspended"
  ) {
    throw new HttpException("Unauthorized: invalid member state", 403);
  }

  const community = parent.community;
  if (
    community.visibility === "private" ||
    community.visibility === "restricted"
  ) {
    const membership =
      await MyGlobal.prisma.community_bbs_community_memberships.findFirst({
        where: {
          community_id: community.id,
          community_member_id: communityMember.id,
          status: "member",
        },
      });

    if (!membership) {
      throw new HttpException(
        "Forbidden: membership required for this community",
        403,
      );
    }
  }

  // Rate limiting: simple sliding window
  const windowStart = toISOStringSafe(new Date(Date.now() - 60 * 1000));
  const recentCount = await MyGlobal.prisma.community_bbs_comments.count({
    where: {
      community_bbs_communitymember_id: communityMember.id,
      created_at: { gte: windowStart },
    },
  });
  if (recentCount >= 5)
    throw new HttpException("Too Many Requests: rate limit exceeded", 429);

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_bbs_comments.create({
      data: {
        id: newId,
        community_bbs_post_id: parent.community_bbs_post_id,
        community_bbs_community_id: parent.community_bbs_community_id,
        community_bbs_communitymember_id: communityMember.id,
        community_bbs_parent_id: parent.id,
        body: body.body,
        is_removed: false,
        removed_reason: null,
        score: 0,
        upvotes: 0,
        downvotes: 0,
        created_at: now,
        updated_at: now,
      },
    }),

    MyGlobal.prisma.community_bbs_comment_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_comment_id: newId,
        community_bbs_snapshot_by_id: communityMember.id,
        body: body.body,
        score: 0,
        upvotes: 0,
        downvotes: 0,
        snapshot_at: now,
        created_at: now,
        updated_at: now,
      },
    }),

    MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "community_member",
        actor_id: communityMember.id,
        entity: "comment",
        action: "created_reply",
        payload: JSON.stringify({
          id: newId,
          parent_id: parent.id,
          post_id: parent.community_bbs_post_id,
        }),
        ip: null,
        created_at: now,
        updated_at: now,
      },
    }),

    MyGlobal.prisma.community_bbs_posts.update({
      where: { id: parent.community_bbs_post_id },
      data: { comment_count: { increment: 1 } },
    }),
  ]);

  // Notification (best-effort)
  try {
    if (parent.author && parent.author.id !== communityMember.id) {
      await MyGlobal.prisma.community_bbs_notifications.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          recipient_id: parent.author.id,
          actor_id: communityMember.id,
          target_type: "comment",
          target_id: newId,
          notification_key: `${parent.author.id}:${newId}:reply`,
          notification_type: "reply",
          channel: "in_app",
          priority: "medium",
          status: "pending",
          attempts: 0,
          created_at: now,
          updated_at: now,
          suppressed: false,
        },
      });
    }
  } catch (e) {
    // Log and continue
    // eslint-disable-next-line no-console
    console.error("notification creation failed", e);
  }

  // Build response DTOs
  const author = parent.author;
  const authorSummary = {
    id: author.id,
    username: author.username,
    display_name: author.display_name ?? undefined,
    karma: author.karma,
    created_at: toISOStringSafe(author.created_at),
    updated_at: toISOStringSafe(author.updated_at),
  } satisfies ICommunityBbsCommunityMember.ISummary;

  const cms = (community as { community_bbs_community_settings?: any })
    .community_bbs_community_settings;
  const community_settings = cms
    ? {
        id: cms.id,
        community_id: cms.community_id,
        visibility: cms.visibility,
        require_post_approval: cms.require_post_approval ?? null,
        max_images_per_post: cms.max_images_per_post ?? null,
        allowed_image_mime_types: cms.allowed_image_mime_types
          ? cms.allowed_image_mime_types.split(",")
          : undefined,
        created_at: toISOStringSafe(cms.created_at),
        updated_at: toISOStringSafe(cms.updated_at),
        deleted_at: cms.deleted_at ? toISOStringSafe(cms.deleted_at) : null,
      }
    : undefined;

  const communitySummary = {
    id: community.id,
    name: community.name,
    slug: community.slug,
    description: community.description ?? undefined,
    creator: {
      id: community.creator.id,
      username: community.creator.username,
      display_name: community.creator.display_name ?? undefined,
      karma: community.creator.karma,
      created_at: toISOStringSafe(community.creator.created_at),
      updated_at: toISOStringSafe(community.creator.updated_at),
    },
    visibility: community.visibility as "public" | "restricted" | "private",
    post_approval_required: community.post_approval_required,
    members_count: community.members_count,
    posts_count: community.posts_count,
    community_settings: community_settings,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : null,
  } satisfies ICommunityBbsCommunity.ISummary;

  const result: ICommunityBbsComment = {
    id: newId,
    community_bbs_post_id: parent.community_bbs_post_id,
    community: communitySummary,
    author: authorSummary,
    parent_id: parent.id,
    body: body.body,
    is_removed: false,
    removed_reason: null,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  return result;
}
