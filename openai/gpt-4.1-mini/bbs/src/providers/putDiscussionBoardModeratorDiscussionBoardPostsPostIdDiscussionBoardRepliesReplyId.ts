import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReplies";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * ⚠️ Implementation incomplete: postId and replyId parameters required but
 * missing in props This function cannot update without identifying the specific
 * reply record. Please add postId and replyId as string & tags.Format<'uuid'>
 * fields in the function parameter.
 */
export async function putDiscussionBoardModeratorDiscussionBoardPostsPostIdDiscussionBoardRepliesReplyId(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardDiscussionBoardReplies.IUpdate;
}): Promise<IDiscussionBoardDiscussionBoardReplies> {
  throw new HttpException(
    "Cannot proceed without required postId and replyId parameters",
    400,
  );
}
