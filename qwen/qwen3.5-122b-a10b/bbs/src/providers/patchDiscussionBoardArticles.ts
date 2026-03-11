import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        OR: [
          {
            title: {
              contains: props.body.search,
            },
          },
          {
            body: {
              contains: props.body.search,
            },
          },
        ],
      }),
    ...(props.body.sectionId !== undefined && {
      discussion_board_section_id: props.body.sectionId,
    }),
    ...(props.body.memberId !== undefined && {
      discussion_board_member_id: props.body.memberId,
    }),
    ...(props.body.createdAtGte !== undefined && {
      created_at: {
        gte: new Date(props.body.createdAtGte),
      },
    }),
    ...(props.body.createdAtLte !== undefined && {
      created_at: {
        lte: new Date(props.body.createdAtLte),
      },
    }),
    ...(props.body.tagIds !== undefined &&
      props.body.tagIds.length > 0 && {
        articleTags: {
          every: {
            discussion_board_tag_id: {
              in: props.body.tagIds,
            },
            deleted_at: null,
          },
        },
      }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    props.body.sortBy === "title"
      ? ({ title: props.body.sortOrder ?? "desc" } as const)
      : ({ created_at: props.body.sortOrder ?? "desc" } as const);
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardArticleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
