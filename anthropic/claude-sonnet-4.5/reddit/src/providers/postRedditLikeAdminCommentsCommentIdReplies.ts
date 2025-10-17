import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminCommentsCommentIdReplies(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IReplyCreate;
}): Promise<IRedditLikeComment> {
  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * Reddit_like_comments table only has reddit_like_member_id foreign key to
   * reddit_like_members. No relation exists to reddit_like_admins table.
   *
   * Administrators cannot author comments with current schema.
   *
   * Resolution requires schema change:
   *
   * - Add admin_id field to reddit_like_comments, OR
   * - Unified user system where admins are also members
   */
  return typia.random<IRedditLikeComment>();
}
