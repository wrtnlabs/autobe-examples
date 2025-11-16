import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconPolDiscussionBoardMemberArticlesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEconPolDiscussionBoardArticle> {
  const article =
    await MyGlobal.prisma.econ_pol_discussion_board_articles.findUnique({
      where: { id: props.id },
    });
  if (!article) throw new HttpException("Article not found", 404);

  const author =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { id: article.econ_pol_discussion_board_member_id },
    });
  if (!author) throw new HttpException("Author not found", 404);

  return {
    id: article.id,
    title: article.title,
    content: article.content,
    author: {
      id: author.id,
      username: author.username,
      displayName: (author as any)["display_name"],
      memberSince: toISOStringSafe((author as any)["member_since"]),
    },
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
  };
}
