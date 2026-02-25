import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardAttachmentTransformer } from "../transformers/EconomicPoliticalDiscussionBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardUserArticlesArticleIdAttachments(props: {
  user: UserPayload;
  articleId: string;
  body: IEconomicPoliticalDiscussionBoardAttachment.IRequest;
}): Promise<IEconomicPoliticalDiscussionBoardAttachment> {
  const article =
    await MyGlobal.prisma.economic_political_discussion_board_articles.findUniqueOrThrow(
      {
        where: { id: props.articleId },
        select: { id: true, user_id: true, deleted_at: true },
      },
    );
  if (article.deleted_at) {
    throw new HttpException("Article not found", 404);
  }
  // Authorization: user must be article author OR admin
  if (
    props.user.id !== article.user_id &&
    typia.assert<"admin">(props.user.type as "admin") !== "admin"
  ) {
    throw new HttpException("Unauthorized", 403);
  }
  // Check current attachment count
  const currentAttachmentCount =
    await MyGlobal.prisma.economic_political_discussion_board_attachments.count(
      {
        where: { article_id: props.articleId, deleted_at: null },
      },
    );
  if (currentAttachmentCount >= 5) {
    throw new HttpException("Maximum attachments per article reached (5)", 400);
  }
  // Create attachment using the correct column name (article_id)
  const attachment =
    await MyGlobal.prisma.economic_political_discussion_board_attachments.create(
      {
        data: {
          id: v4() as string & tags.Format<"uuid">,
          article_id: props.articleId, // Fixed: Use the actual foreign key column name
          url: "default_placeholder_url",
          type: "file" as "file" | "png" | "pdf" | "docx" | "xlsx",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
      },
    );
  return await EconomicPoliticalDiscussionBoardAttachmentTransformer.transform(
    attachment,
  );
}
