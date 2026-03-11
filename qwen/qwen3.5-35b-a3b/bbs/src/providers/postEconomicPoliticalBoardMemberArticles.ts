import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardArticleTransformer } from "../transformers/EconomicPoliticalBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardMemberArticles(props: {
  member: MemberPayload;
  body: IEconomicPoliticalBoardArticle.ICreate;
}): Promise<IEconomicPoliticalBoardArticle> {
  // Validate section exists and is not soft-deleted
  await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
    where: {
      id: props.body.sectionId,
      deleted_at: null,
    },
  });
  const now = new Date();
  const created =
    await MyGlobal.prisma.economic_political_board_articles.create({
      data: {
        id: v4(),
        title: props.body.title,
        content: props.body.content,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        author: {
          connect: { id: props.member.id },
        },
        section: {
          connect: { id: props.body.sectionId },
        },
      },
      include: {
        author: EconomicPoliticalBoardArticleTransformer.select().select.author,
        section:
          EconomicPoliticalBoardArticleTransformer.select().select.section,
        attachments:
          EconomicPoliticalBoardArticleTransformer.select().select.attachments,
        comments:
          EconomicPoliticalBoardArticleTransformer.select().select.comments,
        articleTags:
          EconomicPoliticalBoardArticleTransformer.select().select.articleTags,
      },
    });
  return EconomicPoliticalBoardArticleTransformer.transform(created);
}
