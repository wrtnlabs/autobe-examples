import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSearch";
import { IPageICommunityBbsSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsSearchResult";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSearchResult";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";

export async function patchCommunityBbsSearchGlobal(props: {
  body: ICommunityBbsSearch.IRequest;
}): Promise<IPageICommunityBbsSearchResult.ISummary> {
  const { body } = props;
  const q = body.q ?? undefined;
  const requestedTypes = (body.types ?? [
    "post",
    "comment",
    "community",
    "user",
  ]) as Array<"post" | "comment" | "community" | "user">;

  const rawLimit = Number(body.limit ?? 20);
  const limit = Math.max(1, Math.min(100, rawLimit));
  const sort = (body.sort ?? "relevance") as "relevance" | "newest" | "top";
  const cursorCreatedAt =
    (body.cursor as (string & tags.Format<"date-time">) | undefined) ??
    undefined;

  try {
    // POSTS
    const postWhere: any = {
      deleted_at: null,
      is_published: true,
      business_status: "published",
      ...(body.communitySlug && { community: { slug: body.communitySlug } }),
    };
    if (q)
      postWhere.OR = [{ title: { contains: q } }, { body: { contains: q } }];
    if (cursorCreatedAt && sort === "newest")
      postWhere.created_at = { lt: cursorCreatedAt };

    const posts = await MyGlobal.prisma.community_bbs_posts.findMany({
      where: postWhere,
      include: {
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
      },
      orderBy: sort === "newest" ? { created_at: "desc" } : { score: "desc" },
      take: limit,
    });

    // COMMENTS
    const commentWhere: any = { deleted_at: null };
    if (q) commentWhere.body = { contains: q };
    if (body.communitySlug)
      commentWhere.community = { slug: body.communitySlug };
    if (cursorCreatedAt && sort === "newest")
      commentWhere.created_at = { lt: cursorCreatedAt };

    const comments = await MyGlobal.prisma.community_bbs_comments.findMany({
      where: commentWhere,
      include: {
        community: {
          select: { id: true, slug: true, name: true, visibility: true },
        },
        author: { select: { id: true, username: true, display_name: true } },
      },
      orderBy: sort === "newest" ? { created_at: "desc" } : { score: "desc" },
      take: limit,
    });

    // COMMUNITIES
    const communityWhere: any = { deleted_at: null };
    if (q)
      communityWhere.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
        { description: { contains: q } },
      ];
    if (cursorCreatedAt && sort === "newest")
      communityWhere.created_at = { lt: cursorCreatedAt };

    const communities =
      await MyGlobal.prisma.community_bbs_communities.findMany({
        where: communityWhere,
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
        },
        orderBy: { created_at: "desc" },
        take: limit,
      });

    // USERS
    const userWhere: any = { deleted_at: null };
    if (q)
      userWhere.OR = [
        { username: { contains: q } },
        { display_name: { contains: q } },
      ];
    if (cursorCreatedAt && sort === "newest")
      userWhere.created_at = { lt: cursorCreatedAt };

    const users = await MyGlobal.prisma.community_bbs_communitymember.findMany({
      where: userWhere,
      select: {
        id: true,
        username: true,
        display_name: true,
        karma: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    const results: ICommunityBbsSearchResult.ISummary[] = [];

    if (requestedTypes.includes("post")) {
      for (const p of posts) {
        if (
          p.community &&
          (p.community.visibility === "private" ||
            p.community.visibility === "restricted")
        )
          continue;
        const titleMatch = q ? (p.title ?? "").includes(q) : false;
        const bodyMatch = q ? (p.body ?? "").includes(q) : false;
        const relevance =
          (titleMatch ? 100 : 0) + (bodyMatch ? 50 : 0) + (p.score ?? 0);

        const item: ICommunityBbsPost.ISummary = {
          id: p.id as string & tags.Format<"uuid">,
          title: p.title,
          post_type: p.post_type,
          score: (p.score ?? 0) as number & tags.Type<"int32">,
          upvotes: (p.upvotes ?? 0) as number & tags.Type<"int32">,
          downvotes: (p.downvotes ?? 0) as number & tags.Type<"int32">,
          comment_count: (p.comment_count ?? 0) as number & tags.Type<"int32">,
          published_at: p.published_at ? toISOStringSafe(p.published_at) : null,
          is_published: p.is_published,
          created_at: toISOStringSafe(p.created_at),
          updated_at: toISOStringSafe(p.updated_at),
          author: {
            id: p.author.id as string & tags.Format<"uuid">,
            username: p.author.username,
            display_name: p.author.display_name ?? null,
            karma: (p.author.karma ?? 0) as number & tags.Type<"int32">,
            created_at: toISOStringSafe(p.author.created_at),
            updated_at: toISOStringSafe(p.author.updated_at),
          },
          community: {
            id: p.community.id as string & tags.Format<"uuid">,
            name: p.community.name,
            slug: p.community.slug,
            description: p.community.description ?? null,
            creator: {
              id: p.community.creator.id as string & tags.Format<"uuid">,
              username: p.community.creator.username,
              display_name: p.community.creator.display_name ?? null,
              karma: (p.community.creator.karma ?? 0) as number &
                tags.Type<"int32">,
              created_at: toISOStringSafe(p.community.creator.created_at),
              updated_at: toISOStringSafe(p.community.creator.updated_at),
            },
            visibility: p.community.visibility as
              | "public"
              | "restricted"
              | "private",
            post_approval_required: p.community.post_approval_required,
            members_count: (p.community.members_count ?? 0) as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            posts_count: (p.community.posts_count ?? 0) as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            community_settings: undefined,
            created_at: toISOStringSafe(p.community.created_at),
            updated_at: toISOStringSafe(p.community.updated_at),
            deleted_at: p.community.deleted_at
              ? toISOStringSafe(p.community.deleted_at)
              : null,
          },
        };

        results.push({
          target_type: "post",
          relevance_score: relevance,
          item,
          snippet: p.title ?? (p.body ? p.body.slice(0, 200) : undefined),
        });
      }
    }

    if (requestedTypes.includes("comment")) {
      for (const c of comments) {
        if (
          c.community &&
          (c.community.visibility === "private" ||
            c.community.visibility === "restricted")
        )
          continue;
        const bodyMatch = q ? (c.body ?? "").includes(q) : false;
        const relevance = (bodyMatch ? 50 : 0) + (c.score ?? 0);

        const item: ICommunityBbsComment.ISummary = {
          id: c.id as string & tags.Format<"uuid">,
          body_snippet: (c.body ?? "").slice(0, 200),
          author: {
            id: c.author.id as string & tags.Format<"uuid">,
            username: c.author.username,
            display_name: c.author.display_name ?? null,
            karma: 0 as number & tags.Type<"int32">,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
          community: {
            id: c.community.id as string & tags.Format<"uuid">,
            name: c.community.name ?? "",
            slug: c.community.slug ?? "",
            description: null,
            creator: {
              id: v4() as string & tags.Format<"uuid">,
              username: "",
              display_name: null,
              karma: 0 as number & tags.Type<"int32">,
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
            },
            visibility: "public",
            post_approval_required: false,
            members_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
            posts_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
            community_settings: undefined,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
          parent_id: undefined,
          score: (c.score ?? 0) as number & tags.Type<"int32">,
          upvotes: (c.upvotes ?? 0) as number & tags.Type<"int32">,
          downvotes: (c.downvotes ?? 0) as number & tags.Type<"int32">,
          created_at: toISOStringSafe(c.created_at),
        };

        results.push({
          target_type: "comment",
          relevance_score: relevance,
          item,
          snippet: item.body_snippet,
        });
      }
    }

    if (requestedTypes.includes("community")) {
      for (const cm of communities) {
        if (cm.visibility === "private" || cm.visibility === "restricted")
          continue;
        const nameMatch = q ? (cm.name ?? "").includes(q) : false;
        const descMatch = q ? (cm.description ?? "").includes(q) : false;
        const relevance = (nameMatch ? 80 : 0) + (descMatch ? 30 : 0);

        const item: ICommunityBbsCommunity.ISummary = {
          id: cm.id as string & tags.Format<"uuid">,
          name: cm.name,
          slug: cm.slug,
          description: cm.description ?? null,
          creator: {
            id: cm.creator.id as string & tags.Format<"uuid">,
            username: cm.creator.username,
            display_name: cm.creator.display_name ?? null,
            karma: (cm.creator.karma ?? 0) as number & tags.Type<"int32">,
            created_at: toISOStringSafe(cm.creator.created_at),
            updated_at: toISOStringSafe(cm.creator.updated_at),
          },
          visibility: cm.visibility as "public" | "restricted" | "private",
          post_approval_required: cm.post_approval_required,
          members_count: (cm.members_count ?? 0) as number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          posts_count: (cm.posts_count ?? 0) as number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          community_settings: undefined,
          created_at: toISOStringSafe(cm.created_at),
          updated_at: toISOStringSafe(cm.updated_at),
          deleted_at: cm.deleted_at ? toISOStringSafe(cm.deleted_at) : null,
        };

        results.push({
          target_type: "community",
          relevance_score: relevance,
          item,
          snippet: cm.description ?? cm.name,
        });
      }
    }

    if (requestedTypes.includes("user")) {
      for (const u of users) {
        const nameMatch = q ? (u.username ?? "").includes(q) : false;
        const displayMatch =
          q && u.display_name ? u.display_name.includes(q) : false;
        const relevance =
          (nameMatch ? 60 : 0) + (displayMatch ? 30 : 0) + (u.karma ?? 0);

        const item: ICommunityBbsCommunityMember.ISummary = {
          id: u.id as string & tags.Format<"uuid">,
          username: u.username,
          display_name: u.display_name ?? null,
          karma: (u.karma ?? 0) as number & tags.Type<"int32">,
          created_at: toISOStringSafe(u.created_at),
          updated_at: toISOStringSafe(u.updated_at),
        };

        results.push({
          target_type: "user",
          relevance_score: relevance,
          item: item as any,
          snippet: u.display_name ?? u.username,
        });
      }
    }

    if (sort === "relevance")
      results.sort((a, b) => b.relevance_score - a.relevance_score);
    else if (sort === "newest")
      results.sort((a, b) =>
        ((b.item as any).created_at ?? "").localeCompare(
          (a.item as any).created_at ?? "",
        ),
      );

    const total = results.length;
    const page = Number(body.page ?? 1);
    const current = page;
    const pages = Math.max(1, Math.ceil(total / limit));

    return {
      pagination: {
        current: Number(current) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: Number(pages) as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      data: results.slice((current - 1) * limit, current * limit),
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
