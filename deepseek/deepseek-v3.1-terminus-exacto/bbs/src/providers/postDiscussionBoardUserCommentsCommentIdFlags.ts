import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentFlagCollector } from "../collectors/DiscussionBoardCommentFlagCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentFlagTransformer } from "../transformers/DiscussionBoardCommentFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserCommentsCommentIdFlags(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentFlag.ICreate;
}): Promise<IDiscussionBoardCommentFlag> {
  // Verify comment exists and is not deleted
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      deleted_at: null, // Soft delete check
    },
  });
  // Check for existing flag by same user on same comment (prevent duplicates)
  const existingFlag =
    await MyGlobal.prisma.discussion_board_comment_flags.findFirst({
      where: {
        user_id: props.user.id,
        comment_id: props.commentId,
      },
    });
  if (existingFlag) {
    throw new HttpException(
      "You have already flagged this comment. Please wait for administrator review.",
      400,
    );
  }
  // Convert UUID for collector parameters
  const commentIdTyped = props.commentId as string & tags.Format<"uuid">;
  const userIdTyped = props.user.id as string & tags.Format<"uuid">;
  // Use collector to transform DTO to DB input
  const data = await DiscussionBoardCommentFlagCollector.collect({
    body: props.body,
    user: { id: userIdTyped },
    comment: { id: commentIdTyped },
  });
  // Create the flag with transformer select
  const flag = await MyGlobal.prisma.discussion_board_comment_flags.create({
    data,
    ...DiscussionBoardCommentFlagTransformer.select(),
  });
  // Transform DB result to API response
  return await DiscussionBoardCommentFlagTransformer.transform(flag);
}
