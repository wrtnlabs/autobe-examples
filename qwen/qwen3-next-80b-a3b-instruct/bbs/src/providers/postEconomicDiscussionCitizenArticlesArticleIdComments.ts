import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicDiscussionCommentCollector } from "../collectors/EconomicDiscussionCommentCollector";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicDiscussionCommentTransformer } from "../transformers/EconomicDiscussionCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicDiscussionCitizenArticlesArticleIdComments(props: {
  citizen: CitizenPayload;
  articleId: string;
  body: IEconomicDiscussionComment.ICreate;
}): Promise<IEconomicDiscussionComment> {
  // Verify article exists by ID only - use direct lookup without deleted_at filter
  // The article's existence is determined solely by ID in the database
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: {
        id: props.articleId,
      },
    },
  );
  if (!article) {
    throw new HttpException("Article not found or is inactive", 404);
  }
  // Use collector to transform API DTO to Prisma CreateInput
  const created = await MyGlobal.prisma.economic_discussion_comments.create({
    data: await EconomicDiscussionCommentCollector.collect({
      body: props.body,
      economicDiscussionCitizens: { id: props.citizen.id },
      economicDiscussionCitizenSessions: { id: props.citizen.session_id },
      economicDiscussionArticles: { id: props.articleId },
    }),
    ...EconomicDiscussionCommentTransformer.select(),
  });
  // Transform Prisma result to API response DTO
  return await EconomicDiscussionCommentTransformer.transform(created);
}
