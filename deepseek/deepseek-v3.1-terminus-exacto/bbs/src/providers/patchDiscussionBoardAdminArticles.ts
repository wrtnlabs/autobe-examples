import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminArticles(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (props.body.id !== undefined && props.body.id !== null) {
    whereInput.id = props.body.id;
  }
  if (props.body.title !== undefined && props.body.title !== null) {
    whereInput.title = { contains: props.body.title };
  }
  if (props.body.content !== undefined && props.body.content !== null) {
    whereInput.content = { contains: props.body.content };
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    whereInput.status = props.body.status;
  }
  if (
    props.body.discussion_board_section_id !== undefined &&
    props.body.discussion_board_section_id !== null
  ) {
    whereInput.discussion_board_section_id =
      props.body.discussion_board_section_id;
  }
  if (
    props.body.discussion_board_user_id !== undefined &&
    props.body.discussion_board_user_id !== null
  ) {
    whereInput.discussion_board_user_id = props.body.discussion_board_user_id;
  }
  if (
    props.body.created_at_start !== undefined &&
    props.body.created_at_start !== null
  ) {
    whereInput.created_at = {
      ...(whereInput.created_at as Prisma.DateTimeFilter),
      gte: new Date(props.body.created_at_start),
    };
  }
  if (
    props.body.created_at_end !== undefined &&
    props.body.created_at_end !== null
  ) {
    whereInput.created_at = {
      ...(whereInput.created_at as Prisma.DateTimeFilter),
      lte: new Date(props.body.created_at_end),
    };
  }
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      section: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          display_order: true,
          deleted_at: true,
        },
      } satisfies Prisma.discussion_board_sectionsFindManyArgs,
      author: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
        },
      } satisfies Prisma.discussion_board_usersFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  const transformedData = data.map((article) => ({
    id: article.id as string & tags.Format<"uuid">,
    title: article.title,
    status: article.status,
    created_at: toISOStringSafe(article.created_at),
    author: {
      id: article.author.id as string & tags.Format<"uuid">,
      display_name: article.author.display_name,
      bio: article.author.bio,
      created_at: toISOStringSafe(article.author.created_at),
    } satisfies IDiscussionBoardUser.ISummary,
    section: {
      id: article.section.id as string & tags.Format<"uuid">,
      name: article.section.name,
      description: article.section.description,
      status: article.section.status,
      display_order: article.section.display_order,
      deleted_at: article.section.deleted_at
        ? toISOStringSafe(article.section.deleted_at)
        : null,
    } satisfies IDiscussionBoardSection.ISummary,
  }));
  return {
    pagination: {
      page: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
