import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
    ...(props.body.section_id && {
      discussion_board_section_id: props.body.section_id,
    }),
    ...(props.body.author_id && {
      discussion_board_member_id: props.body.author_id,
    }),
    ...(props.body.search && {
      OR: [
        {
          title: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          body: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
  };
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const [allData, totalBase] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: whereInput,
      orderBy: orderByInput,
      ...DiscussionBoardArticleAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: whereInput,
    }),
  ]);
  let filteredData = allData;
  if (props.body.tag_names && props.body.tag_names.length > 0) {
    filteredData = allData.filter((article) => {
      const tagNames = article.articleTags.map((at) =>
        at.tag.name.toLowerCase(),
      );
      return props.body.tag_names!.every((tagName) =>
        tagNames.includes(tagName.toLowerCase()),
      );
    });
  }
  const total = filteredData.length;
  const paginatedData = filteredData.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      paginatedData,
      DiscussionBoardArticleAtSummaryTransformer.transform,
    ),
  };
}
