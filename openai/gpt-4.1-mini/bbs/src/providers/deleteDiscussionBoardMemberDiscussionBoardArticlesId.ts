import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberDiscussionBoardArticlesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.id },
    select: { discussion_board_member_id: true },
  });

  if (article === null) {
    throw new HttpException("Discussion board article not found", 404);
  }

  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You are not the author of this article",
      403,
    );
  }

  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: props.id },
  });
}
