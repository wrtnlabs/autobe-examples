import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconPolDiscussionBoardMemberArticlesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const article =
    await MyGlobal.prisma.econ_pol_discussion_board_articles.findUnique({
      where: { id: props.id },
      select: { id: true, econ_pol_discussion_board_member_id: true },
    });

  if (article === null) {
    throw new HttpException("Article not found.", 404);
  }

  if (article.econ_pol_discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden.", 403);
  }

  await MyGlobal.prisma.econ_pol_discussion_board_articles.delete({
    where: { id: props.id },
  });
}
