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
import { DiscussionBoardCommentVoteTransformer } from "../transformers/DiscussionBoardCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentIdVotesVoteId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentVote> {
  // Query the vote with comment and article relationship validation
  const vote = await MyGlobal.prisma.discussion_board_comment_votes.findUnique({
    where: {
      id: props.voteId,
      discussion_board_comment_id: props.commentId,
      comment: {
        discussion_board_article_id: props.articleId,
      },
    },
    ...DiscussionBoardCommentVoteTransformer.select(),
  });
  if (!vote) {
    throw new HttpException(
      "Vote not found or does not belong to the specified comment and article",
      404,
    );
  }
  return await DiscussionBoardCommentVoteTransformer.transform(vote);
}
