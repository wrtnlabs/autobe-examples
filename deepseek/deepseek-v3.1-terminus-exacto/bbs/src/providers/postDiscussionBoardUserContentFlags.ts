import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardContentFlagCollector } from "../collectors/DiscussionBoardContentFlagCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardContentFlagTransformer } from "../transformers/DiscussionBoardContentFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserContentFlags(props: {
  user: UserPayload;
  body: IDiscussionBoardContentFlag.ICreate;
}): Promise<IDiscussionBoardContentFlag> {
  // Validate that only one of flagged_article_id or flagged_comment_id is provided
  if (props.body.flagged_article_id && props.body.flagged_comment_id) {
    throw new HttpException(
      "Cannot flag both article and comment simultaneously",
      400,
    );
  }
  if (!props.body.flagged_article_id && !props.body.flagged_comment_id) {
    throw new HttpException(
      "Must specify either article or comment to flag",
      400,
    );
  }
  // Validate flag reason length
  const trimmedReason = props.body.flag_reason.trim();
  if (trimmedReason.length === 0) {
    throw new HttpException("Flag reason cannot be empty", 400);
  }
  if (trimmedReason.length > 1000) {
    throw new HttpException(
      "Flag reason exceeds maximum length of 1000 characters",
      400,
    );
  }
  // Verify the flagged content exists and is not deleted
  if (props.body.flagged_article_id) {
    const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
      where: {
        id: props.body.flagged_article_id,
        deleted_at: null,
      },
    });
    if (!article) {
      throw new HttpException(
        "Flagged article not found or has been deleted",
        404,
      );
    }
    // Optional: Check if user is flagging their own content
    if (article.discussion_board_user_id === props.user.id) {
      throw new HttpException("Cannot flag your own content", 400);
    }
  }
  if (props.body.flagged_comment_id) {
    const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: props.body.flagged_comment_id,
        deleted_at: null,
      },
    });
    if (!comment) {
      throw new HttpException(
        "Flagged comment not found or has been deleted",
        404,
      );
    }
    // Optional: Check if user is flagging their own content
    if (comment.discussion_board_user_id === props.user.id) {
      throw new HttpException("Cannot flag your own content", 400);
    }
  }
  // Verify the reporter user exists
  const reporter = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!reporter) {
    throw new HttpException("Reporter user not found", 404);
  }
  const created = await MyGlobal.prisma.discussion_board_content_flags.create({
    data: await DiscussionBoardContentFlagCollector.collect({
      body: props.body,
      discussionBoardUsers: { id: props.user.id },
    }),
    ...DiscussionBoardContentFlagTransformer.select(),
  });
  return await DiscussionBoardContentFlagTransformer.transform(created);
}
