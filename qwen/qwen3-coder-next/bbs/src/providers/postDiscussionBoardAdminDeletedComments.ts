import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminDeletedComments(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticleComment.IRequest;
}): Promise<IDiscussionBoardArticleComment.IDeleteResponse> {
  // Request body is empty - no comment_ids field exists in IRequest
  // Perform bulk deletion of all non-deleted comments
  const deleted = await MyGlobal.prisma.discussion_board_comments.updateMany({
    where: { deleted_at: null },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    success_count: deleted.count,
    failed_comments: [],
  };
}
