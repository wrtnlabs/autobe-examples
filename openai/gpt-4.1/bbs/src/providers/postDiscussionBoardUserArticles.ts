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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postDiscussionBoardUserArticles(props: {
  user: UserPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const now = toISOStringSafe(new Date());
  const result = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4(),
      title: props.body.title,
      body: props.body.body,
      author_user_id: props.user.id,
      author_admin_id: null,
      created_at: now,
      updated_at: now,
    },
    include: {
      authorUser: true,
    },
  });
  return {
    id: result.id,
    title: result.title,
    body: result.body,
    author_user: result.authorUser
      ? {
          id: result.authorUser.id,
          email: result.authorUser.email,
          is_email_verified: result.authorUser.is_email_verified,
          is_active: result.authorUser.is_active,
          is_blocked: result.authorUser.is_blocked,
          created_at: toISOStringSafe(result.authorUser.created_at),
          updated_at: toISOStringSafe(result.authorUser.updated_at),
          deleted_at:
            result.authorUser.deleted_at === null
              ? null
              : toISOStringSafe(result.authorUser.deleted_at),
        }
      : undefined,
    author_admin: null,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
  };
}
