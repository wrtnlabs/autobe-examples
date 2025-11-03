import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearch";
import { IPageIDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchResult";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function patchDiscussionBoardSearchGlobal(props: {
  body: IDiscussionBoardSearch.IRequest;
}): Promise<IPageIDiscussionBoardSearchResult.ISummary> {
  const { body } = props;

  // Pagination defaults and bounds
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  // Determine which resource types to query
  const typesFilter = body.filters?.types;
  const search = body.query;

  // Build promises for each type (conditionally included)
  const articlePromise =
    typesFilter === undefined || typesFilter.includes("article")
      ? MyGlobal.prisma.discussion_board_articles.findMany({
          where: {
            deleted_at: null,
            state: "published",
            ...(body.filters?.categoryId !== undefined &&
              body.filters?.categoryId !== null && {
                discussion_board_category_id: body.filters?.categoryId,
              }),
            ...(body.filters?.authorUsername !== undefined &&
              body.filters?.authorUsername !== null && {
                author: { username: body.filters?.authorUsername },
              }),
            ...(body.filters?.tagSlugs !== undefined &&
              body.filters?.tagSlugs !== null &&
              body.filters?.tagSlugs.length > 0 && {
                discussion_board_article_tags: {
                  some: {
                    tag: { slug: { in: body.filters?.tagSlugs } },
                  },
                },
              }),
            ...(search && {
              OR: [
                { title: { contains: search } },
                { content: { contains: search } },
              ],
            }),
            ...(body.filters?.createdFrom !== undefined &&
              body.filters?.createdFrom !== null && {
                published_at: { gte: body.filters?.createdFrom },
              }),
            ...(body.filters?.createdTo !== undefined &&
              body.filters?.createdTo !== null && {
                published_at: { lte: body.filters?.createdTo },
              }),
          },
          include: {
            author: true,
            category: true,
            discussion_board_article_tags: { include: { tag: true } },
          },
          orderBy:
            body.sort === "oldest"
              ? { published_at: "asc" }
              : { published_at: "desc" },
          skip,
          take: limit,
        })
      : Promise.resolve([]);

  const commentPromise =
    typesFilter === undefined || typesFilter.includes("comment")
      ? MyGlobal.prisma.discussion_board_comments.findMany({
          where: {
            deleted_at: null,
            is_hidden: false,
            ...(search && { content: { contains: search } }),
            ...(body.filters?.createdFrom !== undefined &&
              body.filters?.createdFrom !== null && {
                created_at: { gte: body.filters?.createdFrom },
              }),
            ...(body.filters?.createdTo !== undefined &&
              body.filters?.createdTo !== null && {
                created_at: { lte: body.filters?.createdTo },
              }),
            ...(body.filters?.authorUsername !== undefined &&
              body.filters?.authorUsername !== null && {
                author: { username: body.filters?.authorUsername },
              }),
          },
          include: { article: true, author: true },
          orderBy:
            body.sort === "oldest"
              ? { created_at: "asc" }
              : { created_at: "desc" },
          skip,
          take: limit,
        })
      : Promise.resolve([]);

  const attachmentPromise =
    typesFilter === undefined || typesFilter.includes("attachment")
      ? MyGlobal.prisma.discussion_board_attachments.findMany({
          where: {
            deleted_at: null,
            ...(search && { original_filename: { contains: search } }),
            ...(body.filters?.createdFrom !== undefined &&
              body.filters?.createdFrom !== null && {
                created_at: { gte: body.filters?.createdFrom },
              }),
            ...(body.filters?.createdTo !== undefined &&
              body.filters?.createdTo !== null && {
                created_at: { lte: body.filters?.createdTo },
              }),
          },
          include: { article: true },
          orderBy:
            body.sort === "oldest"
              ? { created_at: "asc" }
              : { created_at: "desc" },
          skip,
          take: limit,
        })
      : Promise.resolve([]);

  const tagPromise =
    typesFilter === undefined || typesFilter.includes("tag")
      ? MyGlobal.prisma.discussion_board_tags.findMany({
          where: {
            deleted_at: null,
            ...(search && {
              OR: [
                { name: { contains: search } },
                { slug: { contains: search } },
              ],
            }),
          },
          orderBy:
            body.sort === "oldest"
              ? { created_at: "asc" }
              : { created_at: "desc" },
          skip,
          take: limit,
        })
      : Promise.resolve([]);

  const [articles, comments, attachments, tags] = await Promise.all([
    articlePromise,
    commentPromise,
    attachmentPromise,
    tagPromise,
  ]);

  // Map DB rows to unified search summaries
  const mappedArticles = articles.map((a) => ({
    id: a.id,
    title: a.title ?? "",
    excerpt: a.content
      ? a.content.length > 300
        ? a.content.slice(0, 300) + "..."
        : a.content
      : null,
    author: a.author
      ? {
          id: a.author.id,
          username: a.author.username,
          display_name: a.author.display_name ?? null,
          created_at: toISOStringSafe(a.author.created_at),
        }
      : null,
    category: a.category
      ? {
          id: a.category.id,
          name: a.category.name,
          slug: a.category.slug,
          description: a.category.description ?? "",
          is_active: a.category.is_active,
          sort_order: a.category.sort_order ?? null,
          created_at: toISOStringSafe(a.category.created_at),
          updated_at: a.category.updated_at
            ? toISOStringSafe(a.category.updated_at)
            : null,
          deleted_at: a.category.deleted_at
            ? toISOStringSafe(a.category.deleted_at)
            : null,
        }
      : null,
    tags: (a.discussion_board_article_tags ?? []).map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      slug: t.tag.slug,
      description: t.tag.description ?? null,
      is_active: t.tag.is_active,
      created_at: toISOStringSafe(t.tag.created_at),
      updated_at: t.tag.updated_at ? toISOStringSafe(t.tag.updated_at) : null,
      deleted_at: t.tag.deleted_at ? toISOStringSafe(t.tag.deleted_at) : null,
    })),
    is_pinned: a.is_pinned,
    created_at: toISOStringSafe(a.created_at),
    published_at: a.published_at ? toISOStringSafe(a.published_at) : null,
  }));

  const mappedComments = comments.map((c) => ({
    id: c.id,
    title: c.article?.title ?? "",
    excerpt: c.content
      ? c.content.length > 300
        ? c.content.slice(0, 300) + "..."
        : c.content
      : null,
    author: c.author
      ? {
          id: c.author.id,
          username: c.author.username,
          display_name: c.author.display_name ?? null,
          created_at: toISOStringSafe(c.author.created_at),
        }
      : null,
    category:
      c.article && c.article.discussion_board_category_id
        ? {
            id: c.article.discussion_board_category_id,
            // Provide non-null defaults to satisfy ISummary's required string fields
            name: "",
            slug: "",
            description: "",
            is_active: false,
            sort_order: null,
            created_at: toISOStringSafe(c.article.created_at),
            updated_at: null,
            deleted_at: null,
          }
        : null,
    tags: [],
    is_pinned: false,
    created_at: toISOStringSafe(c.created_at),
    published_at:
      c.article && c.article.published_at
        ? toISOStringSafe(c.article.published_at)
        : null,
  }));

  const mappedAttachments = attachments.map((f) => ({
    id: f.id,
    title: f.original_filename,
    excerpt: null,
    author: null,
    category:
      f.article && f.article.discussion_board_category_id
        ? {
            id: f.article.discussion_board_category_id,
            // Provide non-null defaults to satisfy ISummary's required string fields
            name: "",
            slug: "",
            description: "",
            is_active: false,
            sort_order: null,
            created_at: toISOStringSafe(f.article.created_at),
            updated_at: null,
            deleted_at: null,
          }
        : null,
    tags: [],
    is_pinned: false,
    created_at: toISOStringSafe(f.created_at),
    published_at: null,
    thumbnail: null,
  }));

  const mappedTags = tags.map((t) => ({
    id: t.id,
    title: t.name,
    excerpt: null,
    author: null,
    category: null,
    tags: [],
    is_pinned: false,
    created_at: toISOStringSafe(t.created_at),
    published_at: null,
  }));

  // Combine results and sort according to requested sort
  const combined = [
    ...mappedArticles,
    ...mappedComments,
    ...mappedAttachments,
    ...mappedTags,
  ];

  const sorted = combined.sort((a, b) => {
    if (body.sort === "oldest") {
      const at = a.created_at;
      const bt = b.created_at;
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    }
    // newest or relevance default
    const at = a.published_at ?? a.created_at;
    const bt = b.published_at ?? b.created_at;
    if (at > bt) return -1;
    if (at < bt) return 1;
    return 0;
  });

  const total = sorted.length;
  const pageRecords = sorted.slice(skip, skip + limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: pageRecords,
  };
}
