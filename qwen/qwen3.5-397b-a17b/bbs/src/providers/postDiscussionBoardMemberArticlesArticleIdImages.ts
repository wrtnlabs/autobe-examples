import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleImageCollector } from "../collectors/DiscussionBoardArticleImageCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleImageTransformer } from "../transformers/DiscussionBoardArticleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesArticleIdImages(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  if (article.deleted_at !== null) {
    throw new HttpException("Article has been deleted", 404);
  }
  const isAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (article.discussion_board_member_id !== props.member.id && !isAdmin) {
    throw new HttpException(
      "Forbidden - only article author or administrators can add images",
      403,
    );
  }
  const image = await MyGlobal.prisma.discussion_board_article_images.create({
    data: await DiscussionBoardArticleImageCollector.collect({
      body: props.body,
      discussionBoardArticles: { id: props.articleId },
    }),
    ...DiscussionBoardArticleImageTransformer.select(),
  });
  return await DiscussionBoardArticleImageTransformer.transform(image);
}
