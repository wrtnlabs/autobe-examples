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

export async function deleteDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      id: true,
      discussion_board_member_id: true,
      deleted_at: true,
    },
  });
  if (article === null || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  const isOwner = article.discussion_board_member_id === props.member.id;
  if (!isOwner) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
    if (admin === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
