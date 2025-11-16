import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function deleteDiscussionBoardMemberUserArticlesArticleIdLikes(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Idempotent unlike operation: remove like row if it exists for this member and article.
  // Using deleteMany ensures that no error is thrown when no matching record exists.
  await MyGlobal.prisma.discussion_board_article_likes.deleteMany({
    where: {
      discussion_board_article_id: props.articleId,
      discussion_board_memberuser_id: props.memberUser.id,
    },
  });
}
