import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleView";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleViewTransformer } from "../transformers/DiscussionBoardArticleViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorArticlesArticleIdViewsViewId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  viewId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleView> {
  const view =
    await MyGlobal.prisma.discussion_board_article_views.findUniqueOrThrow({
      where: {
        id: props.viewId,
        discussion_board_article_id: props.articleId,
      },
      ...DiscussionBoardArticleViewTransformer.select(),
    });
  return await DiscussionBoardArticleViewTransformer.transform(view);
}
