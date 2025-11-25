import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

export async function patchDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const pageRaw = props.body.page ?? 1;
  const limitRaw = props.body.limit ?? 20;

  const effectivePage = pageRaw < 1 ? 1 : pageRaw;
  const effectiveLimit = limitRaw < 1 ? 20 : limitRaw;
  const skip = (effectivePage - 1) * effectiveLimit;

  const orderByField =
    props.body.orderBy === "created_at" ? "created_at" : "created_at";
  const orderDirection: "asc" | "desc" =
    props.body.orderDirection === "asc" ? "asc" : "desc";

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  const baseWhere: Record<string, unknown> = {
    discussion_board_article_id: props.articleId,
  };

  if (props.body.search !== undefined) {
    baseWhere.body = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  if (props.body.status !== undefined) {
    baseWhere.status = props.body.status;
  }

  const whereCondition = baseWhere;

  const [comments, total, likeCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: whereCondition,
      skip,
      take: effectiveLimit,
      orderBy: {
        [orderByField]: orderDirection,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: whereCondition,
    }),
    MyGlobal.prisma.discussion_board_article_likes.count({
      where: {
        discussion_board_article_id: props.articleId,
      },
    }),
  ]);

  const articleCategory =
    await MyGlobal.prisma.discussion_board_article_categories.findUnique({
      where: { id: article.discussion_board_article_category_id },
    });

  if (articleCategory === null) {
    throw new HttpException("Article category not found", 500);
  }

  // Resolve article author via subtype link tables
  const articleMemberAuthor =
    await MyGlobal.prisma.discussion_board_article_of_memberusers.findUnique({
      where: {
        discussion_board_article_id: article.id,
      },
    });

  const articleAdminAuthor =
    articleMemberAuthor === null
      ? await MyGlobal.prisma.discussion_board_article_of_adminusers.findUnique(
          {
            where: {
              discussion_board_article_id: article.id,
            },
          },
        )
      : null;

  if (articleMemberAuthor === null && articleAdminAuthor === null) {
    throw new HttpException("Article author not resolvable", 500);
  }

  let articleAuthorSummary:
    | IDiscussionBoardMemberuser.ISummary
    | IDiscussionBoardAdminuser.ISummary;

  if (articleMemberAuthor !== null) {
    const member =
      await MyGlobal.prisma.discussion_board_memberusers.findUnique({
        where: { id: articleMemberAuthor.discussion_board_memberuser_id },
      });

    if (member === null) {
      throw new HttpException("Article member author not found", 500);
    }

    articleAuthorSummary = {
      id: member.id,
      display_name: member.display_name,
      account_status: member.account_status,
      created_at: toISOStringSafe(member.created_at),
    };
  } else {
    const adminLink = articleAdminAuthor!;
    const admin = await MyGlobal.prisma.discussion_board_adminusers.findUnique({
      where: { id: adminLink.discussion_board_adminuser_id },
    });

    if (admin === null) {
      throw new HttpException("Article admin author not found", 500);
    }

    articleAuthorSummary = {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name,
      email_verified: admin.email_verified,
      account_status: admin.account_status,
      created_at: toISOStringSafe(admin.created_at),
      last_login_at: admin.last_login_at
        ? toISOStringSafe(admin.last_login_at)
        : undefined,
    };
  }

  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    excerpt: article.summary ?? null,
    category: {
      id: articleCategory.id,
      code: articleCategory.code,
      name: articleCategory.name,
      description: articleCategory.description ?? null,
    },
    author: articleAuthorSummary,
    createdAt: toISOStringSafe(article.created_at),
    likeCount,
    commentCount: total,
  };

  // Collect author link rows for comments
  const commentIds = comments.map((c) => c.id);

  const [commentMemberLinks, commentAdminLinks] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_of_memberusers.findMany({
      where: {
        discussion_board_comment_id: { in: commentIds },
      },
    }),
    MyGlobal.prisma.discussion_board_comment_of_adminusers.findMany({
      where: {
        discussion_board_comment_id: { in: commentIds },
      },
    }),
  ]);

  const memberUserIds = commentMemberLinks.map(
    (l) => l.discussion_board_memberuser_id,
  );
  const adminUserIds = commentAdminLinks.map(
    (l) => l.discussion_board_adminuser_id,
  );

  const [memberUsers, adminUsers] = await Promise.all([
    memberUserIds.length
      ? MyGlobal.prisma.discussion_board_memberusers.findMany({
          where: { id: { in: memberUserIds } },
        })
      : Promise.resolve([] as any[]),
    adminUserIds.length
      ? MyGlobal.prisma.discussion_board_adminusers.findMany({
          where: { id: { in: adminUserIds } },
        })
      : Promise.resolve([] as any[]),
  ]);

  const memberUserMap = new Map<string, (typeof memberUsers)[number]>();
  for (const m of memberUsers) memberUserMap.set(m.id, m);

  const adminUserMap = new Map<string, (typeof adminUsers)[number]>();
  for (const a of adminUsers) adminUserMap.set(a.id, a);

  const commentMemberMap = new Map<
    string,
    (typeof commentMemberLinks)[number]
  >();
  for (const link of commentMemberLinks)
    commentMemberMap.set(link.discussion_board_comment_id, link);

  const commentAdminMap = new Map<string, (typeof commentAdminLinks)[number]>();
  for (const link of commentAdminLinks)
    commentAdminMap.set(link.discussion_board_comment_id, link);

  const data = comments.map((comment) => {
    const memberLink = commentMemberMap.get(comment.id) ?? null;
    const adminLink =
      memberLink === null ? (commentAdminMap.get(comment.id) ?? null) : null;

    let author:
      | IDiscussionBoardMemberuser.ISummary
      | IDiscussionBoardAdminuser.ISummary;

    if (memberLink !== null) {
      const member =
        memberUserMap.get(memberLink.discussion_board_memberuser_id) ?? null;
      if (member === null) {
        throw new HttpException("Comment member author not found", 500);
      }

      author = {
        id: member.id,
        display_name: member.display_name,
        account_status: member.account_status,
        created_at: toISOStringSafe(member.created_at),
      };
    } else if (adminLink !== null) {
      const admin =
        adminUserMap.get(adminLink.discussion_board_adminuser_id) ?? null;
      if (admin === null) {
        throw new HttpException("Comment admin author not found", 500);
      }

      author = {
        id: admin.id,
        email: admin.email,
        display_name: admin.display_name,
        email_verified: admin.email_verified,
        account_status: admin.account_status,
        created_at: toISOStringSafe(admin.created_at),
        last_login_at: admin.last_login_at
          ? toISOStringSafe(admin.last_login_at)
          : undefined,
      };
    } else {
      throw new HttpException("Comment author not resolvable", 500);
    }

    const bodyText = comment.body;
    const contentPreview =
      bodyText.length > 120 ? `${bodyText.slice(0, 117)}...` : bodyText;

    return {
      id: comment.id,
      content_preview: contentPreview,
      createdAt: toISOStringSafe(comment.created_at),
      article: articleSummary,
      author,
    };
  });

  const pagesNumber =
    effectiveLimit === 0 ? 0 : Math.ceil(total / effectiveLimit);

  const pagination: IPage.IPagination = {
    current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      effectivePage - 1,
    ),
    limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      effectiveLimit,
    ),
    records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(total),
    pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      pagesNumber,
    ),
  };

  return {
    pagination,
    data,
  };
}
