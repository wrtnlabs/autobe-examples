import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberSectionsSectionIdArticles(props: {
  member: MemberPayload;
  sectionId: string;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    section_id: props.sectionId,
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      view_count: true,
      created_at: true,
      updated_at: true,
      author_id: true,
      section_id: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  return {
    data: data.map((article) => ({
      id: article.id as string & tags.Format<"uuid"> satisfies string as string,
      title: article.title,
      content: article.content,
      view_count: article.view_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0> satisfies number as number,
      created_at: toISOStringSafe(article.created_at) as string &
        tags.Format<"date-time"> satisfies string as string,
      updated_at: toISOStringSafe(article.updated_at) as string &
        tags.Format<"date-time"> satisfies string as string,
      author_id: article.author_id as string &
        tags.Format<"uuid"> satisfies string as string,
      section_id: article.section_id as string &
        tags.Format<"uuid"> satisfies string as string,
    })),
    pagination: {
      current: page as number &
        tags.Type<"int32"> &
        tags.Minimum<0> satisfies number as number,
      limit: limit as number &
        tags.Type<"int32"> &
        tags.Minimum<0> satisfies number as number,
      records: total as number &
        tags.Type<"int32"> &
        tags.Minimum<0> satisfies number as number,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0> satisfies number as number,
    } satisfies IPage.IPagination,
  };
}
