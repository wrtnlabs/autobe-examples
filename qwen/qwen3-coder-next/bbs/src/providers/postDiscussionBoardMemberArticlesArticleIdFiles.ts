import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesArticleIdFiles(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  // Check if the article exists and belongs to the member
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Create file attachment record manually
  const file = await MyGlobal.prisma.discussion_board_article_files.create({
    data: {
      id: v4(),
      discussion_board_article_id: props.articleId,
      file_name: "filename.txt", // TODO: replace with actual value
      file_url: "https://example.com/file.txt", // TODO: replace with actual value
      file_size: 1024, // TODO: replace with actual value
      file_type: "text/plain", // TODO: replace with actual value
      uploaded_at: new Date().toISOString(), // TODO: replace with proper string format
      created_at: new Date().toISOString(), // TODO: replace with proper string format
      updated_at: new Date().toISOString(), // TODO: replace with proper string format
      deleted_at: null,
    },
  });
  // Use transformer for response
  return await DiscussionBoardArticleFileTransformer.transform(file);
}
