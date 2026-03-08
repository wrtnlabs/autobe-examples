import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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
import { DiscussionBoardArticleCollector } from "../collectors/DiscussionBoardArticleCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSectionsSectionIdArticles(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // Verify section exists and is not deleted
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: await DiscussionBoardArticleCollector.collect({
      body: props.body,
      actor: { id: props.admin.id },
      section: { id: props.sectionId },
    }),
    ...DiscussionBoardArticleTransformer.select(),
  });
  return await DiscussionBoardArticleTransformer.transform(article);
}
