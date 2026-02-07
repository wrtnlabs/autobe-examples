import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string;
  body: IDiscussionBoardArticleComment.IRequest;
}): Promise<IPageIDiscussionBoardArticleComment.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    discussion_board_article_id: props.articleId,
    deleted_at: null,
  } satisfies Prisma.discussion_board_commentsWhereInput;
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.discussion_board_commentsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        discussion_board_member_id: true,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: whereInput,
    }),
  ]);
  return {
    data: data.map((comment) => ({
      id: comment.id as string & tags.Format<"uuid">,
      content: comment.content,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: comment.updated_at
        ? toISOStringSafe(comment.updated_at)
        : undefined,
      author: {
        id: comment.discussion_board_member_id as string & tags.Format<"uuid">,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
