import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportOfArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfArticle";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserReportsReportIdArticle(props: {
  adminUser: AdminuserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReportOfArticle> {
  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: { id: props.reportId },
  });

  if (report === null) {
    throw new HttpException("Report not found", 404);
  }

  if (report.target_type !== "article") {
    throw new HttpException("Report does not target an article", 404);
  }

  const reportOfArticle =
    await MyGlobal.prisma.discussion_board_report_of_articles.findFirst({
      where: { discussion_board_report_id: report.id },
    });

  if (reportOfArticle === null) {
    throw new HttpException("Article association for report not found", 404);
  }

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: reportOfArticle.discussion_board_article_id },
  });

  if (article === null) {
    throw new HttpException("Article not found for report", 404);
  }

  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findUnique({
      where: { id: article.discussion_board_article_category_id },
    });

  if (category === null) {
    throw new HttpException("Article category not found", 500);
  }

  const categorySummary: IDiscussionBoardArticleCategory.ISummary = {
    id: category.id,
    code: category.code,
    name: category.name,
    description:
      category.description === null ? undefined : category.description,
  };

  const articleOfMemberuser =
    await MyGlobal.prisma.discussion_board_article_of_memberusers.findFirst({
      where: { discussion_board_article_id: article.id },
    });

  const articleOfAdminuser =
    await MyGlobal.prisma.discussion_board_article_of_adminusers.findFirst({
      where: { discussion_board_article_id: article.id },
    });

  let author:
    | IDiscussionBoardMemberuser.ISummary
    | IDiscussionBoardAdminuser.ISummary;

  if (articleOfMemberuser !== null) {
    const member =
      await MyGlobal.prisma.discussion_board_memberusers.findUnique({
        where: { id: articleOfMemberuser.discussion_board_memberuser_id },
      });

    if (member === null) {
      throw new HttpException("Article author (memberuser) not found", 500);
    }

    author = {
      id: member.id,
      display_name: member.display_name,
      account_status: member.account_status,
      created_at: toISOStringSafe(member.created_at),
    };
  } else if (articleOfAdminuser !== null) {
    const admin = await MyGlobal.prisma.discussion_board_adminusers.findUnique({
      where: { id: articleOfAdminuser.discussion_board_adminuser_id },
    });

    if (admin === null) {
      throw new HttpException("Article author (adminuser) not found", 500);
    }

    author = {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name,
      // DB does not have profile_image_url column; expose as undefined in summary
      profile_image_url: undefined,
      email_verified: admin.email_verified,
      account_status: admin.account_status,
      created_at: toISOStringSafe(admin.created_at),
      last_login_at: admin.last_login_at
        ? toISOStringSafe(admin.last_login_at)
        : undefined,
    };
  } else {
    throw new HttpException("Article author not found", 500);
  }

  const [likeCount, commentCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_likes.count({
      where: { discussion_board_article_id: article.id },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: { discussion_board_article_id: article.id },
    }),
  ]);

  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    excerpt: article.summary === null ? undefined : article.summary,
    category: categorySummary,
    author,
    createdAt: toISOStringSafe(article.created_at),
    likeCount: likeCount as number & tags.Type<"int32"> & tags.Minimum<0>,
    commentCount: commentCount as number & tags.Type<"int32"> & tags.Minimum<0>,
  };

  const reportDto: IDiscussionBoardReport = {
    id: report.id,
    target_type: report.target_type,
    reporter_type: report.reporter_type,
    reason_code: report.reason_code,
    description: report.description,
    status: report.status,
    action: report.action,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
  };

  const result: IDiscussionBoardReportOfArticle = {
    report: reportDto,
    article: articleSummary,
    created_at: toISOStringSafe(reportOfArticle.created_at),
  };

  return result;
}
