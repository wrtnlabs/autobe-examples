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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentTransformer } from "../transformers/DiscussionBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticlesArticleIdAttachments(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  // Verify target article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Superadmins have ultimate authority (section [18]), no additional permission check needed
  // Generate storage path using UUID
  const storagePath = `attachments/${v4()}/${props.body.filename}`;
  // Create attachment using Collector
  const created = await MyGlobal.prisma.discussion_board_attachments.create({
    data: await DiscussionBoardAttachmentCollector.collect({
      body: props.body,
      discussionBoardArticles: { id: article.id },
      storagePath,
    }),
    ...DiscussionBoardAttachmentTransformer.select(),
  });
  // Transform and return
  return await DiscussionBoardAttachmentTransformer.transform(created);
}
