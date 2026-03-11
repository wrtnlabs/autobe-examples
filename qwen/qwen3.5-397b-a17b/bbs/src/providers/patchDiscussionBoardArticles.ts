import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const orderByInput = (
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_articlesOrderByWithRelationInput;
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.section_id && {
      discussion_board_section_id: props.body.section_id,
    }),
    ...(props.body.author_id && {
      discussion_board_member_id: props.body.author_id,
    }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  const tagFilter = props.body.tags && props.body.tags.length > 0;
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: tagFilter
      ? {
          ...whereInput,
          tags: {
            some: {
              tag: {
                name: {
                  in: props.body.tags!,
                  mode: "insensitive",
                },
              },
            },
          },
        }
      : whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: tagFilter
      ? {
          ...whereInput,
          tags: {
            some: {
              tag: {
                name: {
                  in: props.body.tags!,
                  mode: "insensitive",
                },
              },
            },
          },
        }
      : whereInput,
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
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
