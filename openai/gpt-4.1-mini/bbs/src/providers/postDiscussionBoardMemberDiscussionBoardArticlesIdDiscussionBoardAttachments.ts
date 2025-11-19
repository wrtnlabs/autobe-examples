import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberDiscussionBoardArticlesIdDiscussionBoardAttachments(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.id, deleted_at: null },
    select: { id: true },
  });

  if (!article) {
    throw new HttpException("Discussion board article not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_attachments.create({
    data: {
      id: v4() satisfies string as string & tags.Format<"uuid">,
      discussion_board_article_id: props.id,
      type: props.body.type,
      url: props.body.url,
      filename: props.body.filename,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    discussionBoardArticleId: created.discussion_board_article_id,
    type: created.type satisfies string as string as "image" | "file",
    url: created.url,
    fileName: created.filename,
    createdAt: toISOStringSafe(created.created_at),
  };
}
