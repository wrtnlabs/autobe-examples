import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentSnapshotTransformer } from "../transformers/DiscussionBoardCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentIdSnapshotsSnapshotId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_comment_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...DiscussionBoardCommentSnapshotTransformer.select(),
    });
  if (snapshot.comment.id !== props.commentId) {
    throw new HttpException("Snapshot not found for comment", 404);
  }
  if (snapshot.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Snapshot not found for article", 404);
  }
  return await DiscussionBoardCommentSnapshotTransformer.transform(snapshot);
}
