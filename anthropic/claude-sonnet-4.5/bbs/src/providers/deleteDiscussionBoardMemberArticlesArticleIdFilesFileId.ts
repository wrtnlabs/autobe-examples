import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdFilesFileId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const fileRecord =
    await MyGlobal.prisma.discussion_board_article_files.findUnique({
      where: {
        id: props.fileId,
      },
      include: {
        article: {
          select: {
            id: true,
            discussion_board_member_id: true,
          },
        },
      },
    });

  if (!fileRecord) {
    throw new HttpException("File attachment not found", 404);
  }

  if (fileRecord.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File does not belong to the specified article",
      404,
    );
  }

  if (fileRecord.article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.discussion_board_article_files.delete({
    where: {
      id: props.fileId,
    },
  });
}
