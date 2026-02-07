import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserArticleFavorites(props: {
  user: UserPayload;
  body: IDiscussionBoardArticleFavorite.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Convert date strings to Date objects for Prisma filtering
  const created_at_from = props.body.created_at_from
    ? new Date(props.body.created_at_from)
    : undefined;
  const created_at_to = props.body.created_at_to
    ? new Date(props.body.created_at_to)
    : undefined;
  // Build where conditions for articles
  const articleWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.discussion_board_articlesWhereInput;
  // Query favorites with article joins using proper transformer pattern
  const favorites =
    await MyGlobal.prisma.discussion_board_article_favorites.findMany({
      where: {
        discussion_board_user_id: props.user.id,
        ...(created_at_from && { created_at: { gte: created_at_from } }),
        ...(created_at_to && { created_at: { lte: created_at_to } }),
        article: articleWhereInput,
      },
      include: {
        article: {
          include: {
            author: true,
            section: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  const total = await MyGlobal.prisma.discussion_board_article_favorites.count({
    where: {
      discussion_board_user_id: props.user.id,
      ...(created_at_from && { created_at: { gte: created_at_from } }),
      ...(created_at_to && { created_at: { lte: created_at_to } }),
      article: articleWhereInput,
    },
  });
  const data = await ArrayUtil.asyncMap(favorites, async (favorite) => {
    return await DiscussionBoardArticleAtSummaryTransformer.transform(
      favorite.article,
    );
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
