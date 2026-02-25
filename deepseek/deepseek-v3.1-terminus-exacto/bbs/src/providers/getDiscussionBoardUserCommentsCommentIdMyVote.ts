import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentVoteTransformer } from "../transformers/DiscussionBoardCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserCommentsCommentIdMyVote(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentVote | null> {
  const vote = await MyGlobal.prisma.discussion_board_comment_votes.findUnique({
    where: {
      discussion_board_user_id_discussion_board_comment_id: {
        discussion_board_user_id: props.user.id,
        discussion_board_comment_id: props.commentId,
      },
    },
    ...DiscussionBoardCommentVoteTransformer.select(),
  });
  if (vote === null) {
    return null;
  }
  return await DiscussionBoardCommentVoteTransformer.transform(vote);
}
