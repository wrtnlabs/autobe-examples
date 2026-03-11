import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentTagTransformer } from "../transformers/DiscussionBoardCommentTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentIdTagsTagId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentTag> {
  // Retrieve the tag association with hierarchical validation
  const tag =
    await MyGlobal.prisma.discussion_board_comment_tags.findFirstOrThrow({
      where: {
        id: props.tagId,
        discussion_board_comment_id: props.commentId,
        comment: {
          discussion_board_article_id: props.articleId,
        },
      },
      ...DiscussionBoardCommentTagTransformer.select(),
    });
  // Transform database record to API response
  return await DiscussionBoardCommentTagTransformer.transform(tag);
}
