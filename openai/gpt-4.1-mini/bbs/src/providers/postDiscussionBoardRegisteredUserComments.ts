import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserComments(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  // Cannot use props.body.discussion_board_article_id because it does not exist on ICreate
  // Reject repair due to incomplete information about article id in body
  throw new Error(
    "Property 'discussion_board_article_id' does not exist on type 'ICreate'. Fix cannot proceed without correct property or user input.",
  );
}
