import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { DiscussionBoardCommentCollector } from "../collectors/DiscussionBoardCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  // Verify the article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Create the comment using collector and transformer
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: await DiscussionBoardCommentCollector.collect({
      body: props.body,
      discussionBoardArticles: { id: props.articleId },
      discussionBoardMembers: { id: props.member.id },
    }),
    ...DiscussionBoardCommentTransformer.select(),
  });
  return await DiscussionBoardCommentTransformer.transform(created);
}
