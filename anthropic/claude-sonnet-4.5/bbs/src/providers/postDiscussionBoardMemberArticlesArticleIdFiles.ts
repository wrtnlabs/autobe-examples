import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdFiles(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
    },
    select: {
      id: true,
      discussion_board_member_id: true,
      deleted_at: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.deleted_at !== null) {
    throw new HttpException("Article has been deleted", 404);
  }

  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You can only attach files to your own articles",
      403,
    );
  }

  const fileId = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(new Date());

  const createdFile =
    await MyGlobal.prisma.discussion_board_article_files.create({
      data: {
        id: fileId,
        discussion_board_article_id: props.articleId,
        original_filename: props.body.original_filename,
        file_size: props.body.file_size,
        content_type: props.body.content_type,
        storage_url: props.body.storage_url,
        created_at: createdAt,
      },
    });

  return {
    id: createdFile.id as string & tags.Format<"uuid">,
    discussion_board_article_id:
      createdFile.discussion_board_article_id as string & tags.Format<"uuid">,
    original_filename: createdFile.original_filename,
    file_size: createdFile.file_size,
    content_type: createdFile.content_type,
    storage_url: createdFile.storage_url as string & tags.Format<"uri">,
    created_at: toISOStringSafe(createdFile.created_at),
    deleted_at:
      createdFile.deleted_at === null
        ? undefined
        : toISOStringSafe(createdFile.deleted_at),
  };
}
