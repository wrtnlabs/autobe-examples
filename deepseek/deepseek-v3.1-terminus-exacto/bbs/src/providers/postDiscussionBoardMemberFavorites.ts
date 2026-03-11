import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { DiscussionBoardArticleFavoriteCollector } from "../collectors/DiscussionBoardArticleFavoriteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleFavoriteTransformer } from "../transformers/DiscussionBoardArticleFavoriteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberFavorites(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticleFavorite.ICreate;
}): Promise<IDiscussionBoardArticleFavorite> {
  // 1. Verify member exists and is active
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
    });
  // 2. Verify article exists and is active
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.body.discussion_board_article_id,
      deleted_at: null,
    },
  });
  // 3. Check for existing active favorite
  const existing =
    await MyGlobal.prisma.discussion_board_article_favorites.findFirst({
      where: {
        discussion_board_member_id: props.member.id,
        discussion_board_article_id: props.body.discussion_board_article_id,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("You have already favorited this article", 400);
  }
  // 4. Create proper IEntity objects for collector
  const memberEntity: IEntity = { id: member.id };
  const sessionEntity: IEntity = { id: props.member.session_id };
  // 5. Create the favorite using Collector
  const favorite =
    await MyGlobal.prisma.discussion_board_article_favorites.create({
      data: await DiscussionBoardArticleFavoriteCollector.collect({
        body: props.body,
        discussionBoardMembers: memberEntity,
        discussionBoardMemberSessions: sessionEntity,
      }),
      ...DiscussionBoardArticleFavoriteTransformer.select(),
    });
  // 6. Transform and return
  return await DiscussionBoardArticleFavoriteTransformer.transform(favorite);
}
