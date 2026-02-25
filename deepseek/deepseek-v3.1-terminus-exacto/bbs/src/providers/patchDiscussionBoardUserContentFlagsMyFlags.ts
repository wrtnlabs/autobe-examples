import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardUserContentFlagsMyFlags(props: {
  user: UserPayload;
  body: IDiscussionBoardContentFlag.IRequest;
}): Promise<IPageIDiscussionBoardContentFlag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    reporter_user_id: props.user.id,
    ...(props.body.status && { status: { equals: props.body.status } }),
    ...(props.body.flag_reason && {
      flag_reason: {
        contains: props.body.flag_reason,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.resolved_at_start && {
      resolved_at: { gte: props.body.resolved_at_start },
    }),
    ...(props.body.resolved_at_end && {
      resolved_at: { lte: props.body.resolved_at_end },
    }),
    ...(props.body.flagged_article_id && {
      flagged_article_id: { equals: props.body.flagged_article_id },
    }),
    ...(props.body.flagged_comment_id && {
      flagged_comment_id: { equals: props.body.flagged_comment_id },
    }),
    ...(props.body.reviewing_admin_id && {
      reviewing_admin_id: { equals: props.body.reviewing_admin_id },
    }),
    deleted_at: null,
  } satisfies Prisma.discussion_board_content_flagsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_content_flags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      flag_reason: true,
      status: true,
      created_at: true,
      resolved_at: true,
      reporter: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
        },
      },
      flagged_article: {
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true,
          author: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              created_at: true,
            },
          },
          section: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              display_order: true,
              deleted_at: true,
            },
          },
        },
      },
      flagged_comment: {
        select: {
          id: true,
          content: true,
          created_at: true,
          updated_at: true,
          author: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              created_at: true,
            },
          },
        },
      },
      reviewing_admin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_content_flags.count({
    where: whereInput,
  });
  const transformedData = data.map((flag) => ({
    id: flag.id,
    flagReason: flag.flag_reason,
    status: flag.status,
    createdAt: flag.created_at.toISOString(),
    resolvedAt: flag.resolved_at?.toISOString() ?? null,
    reporter: {
      id: flag.reporter.id,
      display_name: flag.reporter.display_name,
      bio: flag.reporter.bio,
      created_at: flag.reporter.created_at.toISOString(),
    } satisfies IDiscussionBoardUser.ISummary,
    flaggedArticle: flag.flagged_article
      ? ({
          id: flag.flagged_article.id,
          title: flag.flagged_article.title,
          status: flag.flagged_article.status,
          created_at: flag.flagged_article.created_at.toISOString(),
          author: {
            id: flag.flagged_article.author.id,
            display_name: flag.flagged_article.author.display_name,
            bio: flag.flagged_article.author.bio,
            created_at: flag.flagged_article.author.created_at.toISOString(),
          } satisfies IDiscussionBoardUser.ISummary,
          section: {
            id: flag.flagged_article.section.id,
            name: flag.flagged_article.section.name,
            description: flag.flagged_article.section.description,
            status: flag.flagged_article.section.status,
            display_order: flag.flagged_article.section.display_order,
            deleted_at:
              flag.flagged_article.section.deleted_at?.toISOString() ?? null,
          } satisfies IDiscussionBoardSection.ISummary,
        } satisfies IDiscussionBoardArticle.ISummary)
      : null,
    flaggedComment: flag.flagged_comment
      ? ({
          id: flag.flagged_comment.id,
          content: flag.flagged_comment.content,
          author: {
            id: flag.flagged_comment.author.id,
            display_name: flag.flagged_comment.author.display_name,
            bio: flag.flagged_comment.author.bio,
            created_at: flag.flagged_comment.author.created_at.toISOString(),
          } satisfies IDiscussionBoardUser.ISummary,
          created_at: flag.flagged_comment.created_at.toISOString(),
          updated_at: flag.flagged_comment.updated_at.toISOString(),
        } satisfies IDiscussionBoardComment.ISummary)
      : null,
    reviewingAdmin: flag.reviewing_admin
      ? ({
          id: flag.reviewing_admin.id,
          email: flag.reviewing_admin.email,
          display_name: flag.reviewing_admin.display_name,
          created_at: flag.reviewing_admin.created_at.toISOString(),
        } satisfies IDiscussionBoardAdmin.ISummary)
      : null,
  }));
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardContentFlag.ISummary;
}
