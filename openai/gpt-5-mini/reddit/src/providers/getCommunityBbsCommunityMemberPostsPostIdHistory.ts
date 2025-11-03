import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBbsPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostSnapshot";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function getCommunityBbsCommunityMemberPostsPostIdHistory(props: {
  communityMember: CommunitymemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityBbsPostSnapshot.ISummary> {
  const { communityMember, postId } = props;

  const page = 1 as number & tags.Type<"int32">;
  const limit = 20 as number & tags.Type<"int32">;

  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          karma: true,
          created_at: true,
          updated_at: true,
        },
      },
      community: {
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              display_name: true,
              karma: true,
              created_at: true,
              updated_at: true,
            },
          },
          community_bbs_community_settings: true,
        },
      },
    },
  });

  if (!post) throw new HttpException("Not Found", 404);

  const isAuthor = post.community_bbs_communitymember_id === communityMember.id;

  const isModerator =
    await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
      where: {
        community_id: post.community_bbs_community_id,
        community_member_id: communityMember.id,
        active: true,
      },
    });

  if (!isAuthor && !isModerator) throw new HttpException("Forbidden", 403);

  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      target_post_id: post.id,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "post",
      action: "read_snapshot_history",
      payload: JSON.stringify({ postId }),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_post_snapshots.findMany({
      where: { community_bbs_post_id: postId },
      orderBy: [{ snapshot_at: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_bbs_post_snapshots.count({
      where: { community_bbs_post_id: postId },
    }),
  ]);

  const authorSummary = {
    id: post.author.id,
    username: post.author.username,
    display_name: post.author.display_name ?? undefined,
    karma: post.author.karma,
    created_at: toISOStringSafe(post.author.created_at),
    updated_at: toISOStringSafe(post.author.updated_at),
  } satisfies ICommunityBbsCommunityMember.ISummary;

  const communitySettings = post.community.community_bbs_community_settings
    ? ({
        id: post.community.community_bbs_community_settings.id,
        created_at: toISOStringSafe(
          post.community.community_bbs_community_settings.created_at,
        ),
        updated_at: toISOStringSafe(
          post.community.community_bbs_community_settings.updated_at,
        ),
        deleted_at: post.community.community_bbs_community_settings.deleted_at
          ? toISOStringSafe(
              post.community.community_bbs_community_settings.deleted_at,
            )
          : null,
        community_id:
          post.community.community_bbs_community_settings.community_id,
        visibility: post.community.community_bbs_community_settings
          .visibility as "public" | "restricted" | "private",
        require_post_approval:
          post.community.community_bbs_community_settings.require_post_approval,
        max_images_per_post:
          post.community.community_bbs_community_settings.max_images_per_post,
        allowed_image_mime_types: ((): string[] | undefined => {
          const raw =
            post.community.community_bbs_community_settings
              .allowed_image_mime_types;
          if (raw == null) return undefined;
          // If stored as JSON array string, try to parse; otherwise treat as comma-separated
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map((v) => String(v));
          } catch (_e) {
            /* ignore parse error and fallback to comma-split */
          }
          return String(raw)
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        })(),
      } satisfies ICommunityBbsCommunitySettings)
    : undefined;

  const postSummary = {
    id: post.id,
    title: post.title,
    post_type: post.post_type,
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    comment_count: post.comment_count,
    is_published: post.is_published,
    published_at: post.published_at ? toISOStringSafe(post.published_at) : null,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    author: authorSummary,
    community: {
      id: post.community.id,
      name: post.community.name,
      slug: post.community.slug,
      description: post.community.description ?? undefined,
      creator: {
        id: post.community.creator.id,
        username: post.community.creator.username,
        display_name: post.community.creator.display_name ?? undefined,
        karma: post.community.creator.karma,
        created_at: toISOStringSafe(post.community.creator.created_at),
        updated_at: toISOStringSafe(post.community.creator.updated_at),
      },
      visibility: post.community.visibility as
        | "public"
        | "restricted"
        | "private",
      post_approval_required: post.community.post_approval_required,
      members_count: post.community.members_count,
      posts_count: post.community.posts_count,
      community_settings: communitySettings,
      created_at: toISOStringSafe(post.community.created_at),
      updated_at: toISOStringSafe(post.community.updated_at),
      deleted_at: post.community.deleted_at
        ? toISOStringSafe(post.community.deleted_at)
        : null,
    },
  } satisfies ICommunityBbsPost.ISummary;

  const data = rows.map((s) => ({
    id: s.id,
    post_id: s.community_bbs_post_id,
    post: postSummary,
    author_id: s.community_bbs_communitymember_id,
    author: authorSummary,
    title: s.title,
    body: s.body === null ? null : s.body,
    post_type: s.post_type,
    link_url: s.link_url === null ? null : s.link_url,
    score: s.score,
    upvotes: s.upvotes,
    downvotes: s.downvotes,
    comment_count: s.comment_count,
    snapshot_at: toISOStringSafe(s.snapshot_at),
  })) satisfies ICommunityBbsPostSnapshot.ISummary[];

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
