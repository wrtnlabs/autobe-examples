import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleFileCollector } from "../collectors/DiscussionBoardArticleFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesArticleIdFiles(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId, deleted_at: null },
    });
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const created = await MyGlobal.prisma.discussion_board_article_files.create({
    data: await DiscussionBoardArticleFileCollector.collect({
      body: props.body,
      article: { id: props.articleId },
      member: { id: props.member.id },
    }),
    ...DiscussionBoardArticleFileTransformer.select(),
  });
  return await DiscussionBoardArticleFileTransformer.transform(created);
}
