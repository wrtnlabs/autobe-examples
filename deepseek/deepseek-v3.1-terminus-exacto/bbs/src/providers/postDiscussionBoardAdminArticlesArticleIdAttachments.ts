import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAttachmentCollector } from "../collectors/DiscussionBoardAttachmentCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentTransformer } from "../transformers/DiscussionBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdAttachments(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  // 1. Verify article exists and admin has permissions
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // 2. Generate storage path (matching Collector's internal UUID)
  const attachmentId: string = v4();
  const storagePath = `attachments/${props.articleId}/${attachmentId}.${props.body.filetype}`;
  // 3. Create attachment using Collector with proper article entity
  const attachment = await MyGlobal.prisma.discussion_board_attachments.create({
    data: await DiscussionBoardAttachmentCollector.collect({
      body: props.body,
      discussionBoardArticles: { id: article.id } satisfies IEntity,
      storagePath,
    }),
    ...DiscussionBoardAttachmentTransformer.select(),
  });
  // 4. Transform and return
  return await DiscussionBoardAttachmentTransformer.transform(attachment);
}
