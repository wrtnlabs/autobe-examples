import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      authorUser: true,
      authorAdmin: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  const hasTitle = Object.prototype.hasOwnProperty.call(props.body, "title");
  const hasBody = Object.prototype.hasOwnProperty.call(props.body, "body");
  if (!hasTitle && !hasBody) {
    throw new HttpException(
      "At least one of title or body must be provided.",
      400,
    );
  }
  const updateData = {
    ...(hasTitle ? { title: props.body.title } : {}),
    ...(hasBody ? { body: props.body.body } : {}),
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: updateData,
    include: {
      authorUser: true,
      authorAdmin: true,
    },
  });
  // Prisma admin model has no display_name, so cannot fulfill ISummary
  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    author_user: updated.authorUser
      ? {
          id: updated.authorUser.id,
          email: updated.authorUser.email,
          is_email_verified: updated.authorUser.is_email_verified,
          is_active: updated.authorUser.is_active,
          is_blocked: updated.authorUser.is_blocked,
          created_at: toISOStringSafe(updated.authorUser.created_at),
          updated_at: toISOStringSafe(updated.authorUser.updated_at),
          deleted_at:
            updated.authorUser.deleted_at !== null &&
            updated.authorUser.deleted_at !== undefined
              ? toISOStringSafe(updated.authorUser.deleted_at)
              : undefined,
        }
      : undefined,
    author_admin: undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
