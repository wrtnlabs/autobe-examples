import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardCommentCollector } from "../collectors/EconomicBoardCommentCollector";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardCitizenArticlesArticleIdComments(props: {
  citizen: CitizenPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicBoardComment.ICreate;
}): Promise<IEconomicBoardComment> {
  // Validate article exists and is not deleted
  const article = await MyGlobal.prisma.economic_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    select: { id: true },
  });
  if (!article) {
    throw new HttpException("Article not found or deleted", 404);
  }
  // Validate citizen account is active and not banned
  const citizen = await MyGlobal.prisma.economic_board_citizens.findUnique({
    where: { id: props.citizen.id, deleted_at: null },
    select: { id: true, is_banned: true },
  });
  if (!citizen) {
    throw new HttpException("User not found", 403);
  }
  if (citizen.is_banned) {
    throw new HttpException("User account is banned", 403);
  }
  // Use Pattern A: Collector to transform Create DTO to database input
  const created = await MyGlobal.prisma.economic_board_comments.create({
    data: await EconomicBoardCommentCollector.collect({
      body: props.body,
      economicBoardArticles: { id: props.articleId },
      economicBoardCitizens: { id: props.citizen.id },
    }),
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      deleted_by_admin: true,
      deletion_reason: true,
    },
  });
  // Return transformed result - Pattern A
  return {
    id: created.id as string & tags.Format<"uuid">,
    content: created.content,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: created.deleted_at
      ? (toISOStringSafe(created.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
    deleted_by_admin: created.deleted_by_admin,
    deletion_reason: created.deletion_reason,
  };
}
