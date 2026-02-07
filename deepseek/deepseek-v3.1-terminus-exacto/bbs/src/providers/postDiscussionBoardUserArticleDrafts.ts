import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
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
import { DiscussionBoardArticleDraftCollector } from "../collectors/DiscussionBoardArticleDraftCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleDraftTransformer } from "../transformers/DiscussionBoardArticleDraftTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticleDrafts(props: {
  user: UserPayload;
  body: IDiscussionBoardArticleDraft.ICreate;
}): Promise<IDiscussionBoardArticleDraft> {
  // Validate user session exists
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findUnique({
      where: { id: props.user.session_id },
    });
  if (!session) {
    throw new HttpException("Invalid session", 401);
  }
  // Create the draft using collector pattern
  const created = await MyGlobal.prisma.discussion_board_article_drafts.create({
    data: await DiscussionBoardArticleDraftCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardArticleDraftTransformer.select(),
  });
  // Transform and return the response
  return await DiscussionBoardArticleDraftTransformer.transform(created);
}
