import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminDeletedComments(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardArticleComment.IRequest;
}): Promise<IDiscussionBoardArticleComment.IDeleteResponse> {
  // Extract comment IDs from request body and validate they exist
  const commentIds = (props.body as any).ids || [];
  if (commentIds.length === 0) {
    return {
      deletedCount: 0,
      failed: [],
    };
  }
  // Validate all IDs are UUID format and convert to plain string array for Prisma
  const validCommentIds: string[] = commentIds
    .filter(
      (id: unknown): id is string => typeof id === "string" && id.length === 36,
    )
    .map((id: string) => id);
  if (validCommentIds.length === 0) {
    return {
      deletedCount: 0,
      failed: [],
    };
  }
  // Update all comments with deleted_at timestamp using proper date handling
  const result = await MyGlobal.prisma.discussion_board_comments.updateMany({
    where: {
      id: { in: validCommentIds },
      deleted_at: null, // Only update non-deleted comments
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    deletedCount: result.count,
    failed: [],
  };
}
