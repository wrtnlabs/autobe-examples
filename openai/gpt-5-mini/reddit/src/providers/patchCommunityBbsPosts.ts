import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function patchCommunityBbsPosts(props: {
  body: ICommunityBbsPost.IRequest;
}): Promise<IPageICommunityBbsPost.ISummary> {
  const { body } = props;

  const limit = Number(body.limit ?? 25);
  if (limit > 100) throw new HttpException("Request Entity Too Large", 413);

  // Build where condition (no 'as const' to avoid overly strict literal types)
  const whereCondition = {
    deleted_at: null,
    is_published: true,
    business_status: "published",
    ...(body.q !== undefined &&
      body.q !== null &&
      body.q !== "" && {
        OR: [{ title: { contains: body.q } }, { body: { contains: body.q } }],
      }),
    ...(body.community_slug !== undefined &&
      body.community_slug !== null && {
        community: { slug: body.community_slug },
      }),
    ...(body.author_username !== undefined &&
      body.author_username !== null && {
        author: { username: body.author_username },
      }),
    ...(body.post_type !== undefined &&
      body.post_type !== null && {
        post_type: body.post_type,
      }),
    ...((body.start_date !== undefined && body.start_date !== null) ||
    (body.end_date !== undefined && body.end_date !== null)
      ? {
          published_at: {
            ...(body.start_date !== undefined &&
              body.start_date !== null && { gte: body.start_date }),
            ...(body.end_date !== undefined &&
              body.end_date !== null && { lte: body.end_date }),
          },
        }
      : {}),
  };

  // Explicitly type orderBy so SortOrder literal types are preserved
  const orderBy: Prisma.community_bbs_postsOrderByWithRelationInput =
    body.sort === "new"
      ? { created_at: "desc" }
      : body.sort === "top"
        ? { score: "desc" }
        : body.sort === "hot"
          ? { score: "desc" }
          : body.sort === "controversial"
            ? { score: "desc" }
            : { created_at: "desc" };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_posts.findMany({
      where: whereCondition,
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
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            visibility: true,
            post_approval_required: true,
            members_count: true,
            posts_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
          },
        },
      },
      orderBy,
      take: limit,
      skip: 0,
    }),
    MyGlobal.prisma.community_bbs_posts.count({ where: whereCondition }),
  ]);

  const pageCount = Math.ceil(total / limit);

  // Map rows treating each row as any to avoid depending on Prisma compile-time relation inference
  const data = rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    post_type: r.post_type,
    score: r.score,
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    comment_count: r.comment_count,
    published_at: r.published_at ? toISOStringSafe(r.published_at) : null,
    is_published: r.is_published,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    author: {
      id: r.author?.id,
      username: r.author?.username,
      display_name: r.author?.display_name ?? null,
      karma: r.author?.karma,
      created_at: r.author?.created_at
        ? toISOStringSafe(r.author.created_at)
        : (void 0 as any),
      updated_at: r.author?.updated_at
        ? toISOStringSafe(r.author.updated_at)
        : (void 0 as any),
    },
    community: r.community
      ? {
          id: r.community.id,
          name: r.community.name,
          slug: r.community.slug,
          description: r.community.description ?? null,
          creator: r.community.creator
            ? {
                id: r.community.creator.id,
                username: r.community.creator.username,
                display_name: r.community.creator.display_name ?? null,
                karma: r.community.creator.karma,
                created_at: r.community.creator.created_at
                  ? toISOStringSafe(r.community.creator.created_at)
                  : (void 0 as any),
                updated_at: r.community.creator.updated_at
                  ? toISOStringSafe(r.community.creator.updated_at)
                  : (void 0 as any),
              }
            : null,
          visibility: r.community.visibility,
          post_approval_required: r.community.post_approval_required,
          members_count: r.community.members_count,
          posts_count: r.community.posts_count,
          community_settings: undefined,
          created_at: toISOStringSafe(r.community.created_at),
          updated_at: toISOStringSafe(r.community.updated_at),
          deleted_at: r.community.deleted_at
            ? toISOStringSafe(r.community.deleted_at)
            : null,
        }
      : null,
  }));

  // Cast final return to the declared interface to satisfy TypeScript while preserving runtime shape
  return {
    pagination: {
      current: Number(1),
      limit: Number(limit),
      records: total,
      pages: pageCount,
    },
    data,
  } as unknown as IPageICommunityBbsPost.ISummary;
}
