import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
  // Verify article exists and is not deleted
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId, deleted_at: null },
      select: { id: true },
    });
  // Verify member exists and is not banned
  const member =
    await MyGlobal.prisma.discussion_board_members.findFirstOrThrow({
      where: { id: props.member.id, deleted_at: null },
      select: { id: true, ban_status: true },
    });
  if (member.ban_status === "banned") {
    throw new HttpException("You are banned", 403);
  }
  // Validate content is non-empty
  if (props.body.content.trim().length === 0) {
    throw new HttpException("Comment content cannot be empty", 400);
  }
  // Create comment using collector
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: await DiscussionBoardCommentCollector.collect({
      body: props.body,
      discussionBoardArticles: article,
      discussionBoardMembers: member,
      discussionBoardMemberSessions: { id: props.member.session_id },
    }),
    ...DiscussionBoardCommentTransformer.select(),
  });
  // Transform to API response
  return await DiscussionBoardCommentTransformer.transform(created);
}
