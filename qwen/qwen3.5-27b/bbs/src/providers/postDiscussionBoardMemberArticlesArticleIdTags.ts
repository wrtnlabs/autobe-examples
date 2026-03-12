import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleTagCollector } from "../collectors/DiscussionBoardArticleTagCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesArticleIdTags(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.ICreate;
}): Promise<IDiscussionBoardArticleTag> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, discussion_board_member_id: true, deleted_at: true },
    });
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (article.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const records = await DiscussionBoardArticleTagCollector.collect({
    body: props.body,
    discussionBoardArticles: article,
  });
  const created = await MyGlobal.prisma.discussion_board_article_tags.create({
    data: records[0],
    ...DiscussionBoardArticleTagTransformer.select(),
  });
  for (let i = 1; i < records.length; i++) {
    await MyGlobal.prisma.discussion_board_article_tags.create({
      data: records[i],
    });
  }
  return await DiscussionBoardArticleTagTransformer.transform(created);
}
