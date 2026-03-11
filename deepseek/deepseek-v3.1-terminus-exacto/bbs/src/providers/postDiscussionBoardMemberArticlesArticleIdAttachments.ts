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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAttachmentTransformer } from "../transformers/DiscussionBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  // Verify article exists and member has edit permissions
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        discussion_board_member_id: true,
        status: true,
      },
    });
  // Check ownership: member must be article author
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Ensure article is not deleted
  if (article.status === "deleted") {
    throw new HttpException("Article not found", 404);
  }
  // Create attachment using collector
  // Note: storage_path needs to be provided - using body.filename for now
  const attachment = await MyGlobal.prisma.discussion_board_attachments.create({
    data: await DiscussionBoardAttachmentCollector.collect({
      body: props.body,
      discussionBoardArticles: { id: props.articleId } as IEntity,
      storagePath: props.body.filename, // TODO: proper storage path generation
    }),
    ...DiscussionBoardAttachmentTransformer.select(),
  });
  return await DiscussionBoardAttachmentTransformer.transform(attachment);
}
