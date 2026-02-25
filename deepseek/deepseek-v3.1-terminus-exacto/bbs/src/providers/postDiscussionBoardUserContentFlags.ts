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
  // Validate exactly one reference is provided
  if (
    (props.body.flagged_article_id === undefined &&
      props.body.flagged_comment_id === undefined) ||
    (props.body.flagged_article_id !== undefined &&
      props.body.flagged_comment_id !== undefined)
  ) {
    throw new HttpException(
      "Either flagged_article_id or flagged_comment_id must be provided, but not both",
      400,
    );
  }
  // Verify user exists and is active
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { id: props.user.id, deleted_at: null },
  });
  if (user === null) {
    throw new HttpException("User not found", 404);
  }
  // Verify referenced content exists
  if (props.body.flagged_article_id !== undefined) {
    const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
      where: { id: props.body.flagged_article_id!, deleted_at: null },
    });
    if (article === null) {
      throw new HttpException("Article not found", 404);
    }
  }
  if (props.body.flagged_comment_id !== undefined) {
    const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: { id: props.body.flagged_comment_id!, deleted_at: null },
    });
    if (comment === null) {
      throw new HttpException("Comment not found", 404);
    }
  }
  // Create the content flag using Collector
  const flag = await MyGlobal.prisma.discussion_board_content_flags.create({
    data: await DiscussionBoardContentFlagCollector.collect({
      body: props.body,
      discussionBoardUsers: { id: props.user.id },
    }),
    ...DiscussionBoardContentFlagTransformer.select(),
  });
  // Transform and return the result
  return await DiscussionBoardContentFlagTransformer.transform(flag);
}
