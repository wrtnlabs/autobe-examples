import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentAtTrendingTransformer } from "../transformers/DiscussionBoardCommentAtTrendingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserCommentsTrending(props: {
  user: UserPayload;
}): Promise<IPageIDiscussionBoardComment.ITrending> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Query trending comments with proper filtering
  const comments = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: {
      deleted_at: null,
      article: {
        deleted_at: null,
        status: "published",
      },
      author: {
        deleted_at: null,
      },
    },
    ...DiscussionBoardCommentAtTrendingTransformer.select(),
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Transform comments using trending transformer
  const trendingComments = await ArrayUtil.asyncMap(
    comments,
    DiscussionBoardCommentAtTrendingTransformer.transform,
  );
  // Sort by trending score descending
  trendingComments.sort((a, b) => b.trending_score - a.trending_score);
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: {
      deleted_at: null,
      article: {
        deleted_at: null,
        status: "published",
      },
      author: {
        deleted_at: null,
      },
    },
  });
  return {
    data: trendingComments,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
