import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBbsCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommentSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentSnapshot";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function getCommunityBbsCommunityMemberCommentsCommentIdHistory(props: {
  communityMember: CommunitymemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityBbsCommentSnapshot.ISummary> {
  const { communityMember, commentId } = props;

  const page = 1 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;
  const skip = (page - 1) * limit;

  // Load base comment (no nested selects to avoid complex inferred types)
  const comment =
    await MyGlobal.prisma.community_bbs_comments.findUniqueOrThrow({
      where: { id: commentId },
    });

  // Authorization: author or active moderator
  if (comment.community_bbs_communitymember_id !== communityMember.id) {
    const moderator =
      await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
        where: {
          community_id: comment.community_bbs_community_id,
          community_member_id: communityMember.id,
          active: true,
        },
      });

    if (!moderator) throw new HttpException("Unauthorized", 403);
  }

  // Fetch author and community (and community.creator) separately for clear typing
  const author =
    await MyGlobal.prisma.community_bbs_communitymember.findUniqueOrThrow({
      where: { id: comment.community_bbs_communitymember_id },
    });

  const community =
    await MyGlobal.prisma.community_bbs_communities.findUniqueOrThrow({
      where: { id: comment.community_bbs_community_id },
      include: { creator: true },
    });

  // Record audit
  const auditId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: auditId,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "comment_snapshot_history",
      action: "view",
      payload: JSON.stringify({ commentId }),
      ip: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Query snapshots
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_comment_snapshots.findMany({
      where: { community_bbs_comment_id: commentId },
      orderBy: { snapshot_at: "desc" },
      skip,
      take: limit,
      include: {
        snapshotBy: {
          select: {
            id: true,
            username: true,
            display_name: true,
            karma: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.community_bbs_comment_snapshots.count({
      where: { community_bbs_comment_id: commentId },
    }),
  ]);

  // Build comment summary
  const commentSummary = {
    id: comment.id,
    body_snippet: comment.body ? String(comment.body) : "",
    author: {
      id: author.id,
      username: author.username,
      display_name: author.display_name ?? null,
      karma: author.karma,
      created_at: toISOStringSafe(author.created_at),
      updated_at: toISOStringSafe(author.updated_at),
    },
    community: {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description ?? null,
      creator: {
        id: community.creator.id,
        username: community.creator.username,
        display_name: community.creator.display_name ?? null,
        karma: community.creator.karma,
        created_at: toISOStringSafe(community.creator.created_at),
        updated_at: toISOStringSafe(community.creator.updated_at),
      },
      visibility: community.visibility as "public" | "restricted" | "private",
      post_approval_required: community.post_approval_required,
      members_count: community.members_count,
      posts_count: community.posts_count,
      created_at: toISOStringSafe(community.created_at),
      updated_at: toISOStringSafe(community.updated_at),
      community_settings: undefined,
    },
    parent_id: comment.community_bbs_parent_id ?? null,
    score: comment.score,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    created_at: toISOStringSafe(comment.created_at),
  };

  const data = rows.map((r) => ({
    id: r.id,
    comment_id: r.community_bbs_comment_id,
    comment: commentSummary,
    snapshot_by_id: r.community_bbs_snapshot_by_id ?? null,
    snapshotBy: r.snapshotBy
      ? {
          id: r.snapshotBy.id,
          username: r.snapshotBy.username,
          display_name: r.snapshotBy.display_name ?? null,
          karma: r.snapshotBy.karma,
          created_at: toISOStringSafe(r.snapshotBy.created_at),
          updated_at: toISOStringSafe(r.snapshotBy.updated_at),
        }
      : null,
    body: r.body,
    score: r.score,
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    snapshot_at: toISOStringSafe(r.snapshot_at),
    created_at: toISOStringSafe(r.created_at),
  }));

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
