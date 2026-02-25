import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentCollector } from "../collectors/DiscussionBoardCommentCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserComments(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  // Validation: Comment content must not be empty
  if (props.body.content.trim().length === 0) {
    throw new HttpException("Comment content must not be empty", 400);
  }
  // Collect data ready for Prisma create operation
  const data = await DiscussionBoardCommentCollector.collect({
    body: props.body,
    author: {
      id: props.registeredUser.id,
    },
  });
  // Create comment record including relation joins
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data,
    ...DiscussionBoardCommentTransformer.select(),
  });
  // Transform raw DB record to API DTO
  return await DiscussionBoardCommentTransformer.transform(created);
}
