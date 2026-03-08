import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardAttachmentTransformer } from "../transformers/EconomicPoliticalBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAttachment.ICreate;
}): Promise<IEconomicPoliticalBoardAttachment> {
  // Query article for ownership validation (only needed fields)
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        author_id: true,
        deleted_at: true,
      },
    });
  // Verify article is not soft-deleted
  if (article.deleted_at !== null) {
    throw new HttpException("Article is deleted", 403);
  }
  // Validate ownership: member must own the article or be administrator
  const isOwner = article.author_id === props.member.id;
  const adminRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { user_id: props.member.id },
      },
    );
  const isAdmin = adminRole !== null;
  if (!isOwner && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Create attachment record
  const created =
    await MyGlobal.prisma.economic_political_board_attachments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        file_url: props.body.file_url,
        file_name: props.body.file_name,
        file_type: props.body.file_type,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        article: { connect: { id: props.articleId } },
      },
    });
  // Query the created attachment with full relations using transformer's select
  const withRelations =
    await MyGlobal.prisma.economic_political_board_attachments.findUniqueOrThrow(
      {
        where: { id: created.id },
        ...EconomicPoliticalBoardAttachmentTransformer.select(),
      },
    );
  // Transform and return
  return await EconomicPoliticalBoardAttachmentTransformer.transform(
    withRelations,
  );
}
