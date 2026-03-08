import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postDiscussionBoardMemberArticlesArticleIdTags(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.ITagsRequest;
}): Promise<IDiscussionBoardArticle.ITagsResponse> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true },
    });
  if (article.author_id !== props.member.id) {
    throw new HttpException("Access denied", 403);
  }
  const addedTags: string[] = [];
  for (const tagName of props.body.tags) {
    if (!tagName || tagName.trim().length === 0) {
      continue;
    }
    const trimmedName = tagName.trim();
    const existingAssociation =
      await MyGlobal.prisma.discussion_board_article_tags.findUnique({
        where: { article_id: props.articleId },
      });
    if (!existingAssociation) {
      await MyGlobal.prisma.discussion_board_article_tags.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          article_id: props.articleId,
          created_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        },
      });
      addedTags.push(trimmedName);
    }
  }
  return {
    status: "success" as const,
    tagsAdded: (addedTags.length > 0 ? addedTags.length : 0) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
