import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Find the article and verify it exists and is not soft-deleted
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
      },
    });
  // Check authorization: user must be the article author
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // If sectionId is provided, verify the section exists and is not deleted
  if (props.body.sectionId !== undefined) {
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.body.sectionId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  // Update the article
  await MyGlobal.prisma.discussion_board_articles.update({
    where: {
      id: props.articleId,
    },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.content !== undefined && { content: props.body.content }),
      ...(props.body.sectionId !== undefined && {
        discussion_board_section_id: props.body.sectionId,
      }),
      updated_at: new Date(),
    },
  });
  // Return the updated article using transformer
  const updated =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
      },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return await DiscussionBoardArticleTransformer.transform(updated);
}
