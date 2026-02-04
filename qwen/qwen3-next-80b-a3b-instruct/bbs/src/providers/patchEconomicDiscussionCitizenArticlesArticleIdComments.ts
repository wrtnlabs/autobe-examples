import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicDiscussionCommentAtSummaryTransformer } from "../transformers/EconomicDiscussionCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicDiscussionCitizenArticlesArticleIdComments(props: {
  citizen: CitizenPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IPageIEconomicDiscussionComment.ISummary> {
  // Default pagination values
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Query comments for the specified article, ordered by created_at ascending
  const comments = await MyGlobal.prisma.economic_discussion_comments.findMany({
    where: {
      article: {
        id: props.articleId,
      },
    },
    orderBy: {
      created_at: "asc",
    },
    skip,
    take: limit,
    ...EconomicDiscussionCommentAtSummaryTransformer.select(),
  });
  // Count total comments for this article
  const total = await MyGlobal.prisma.economic_discussion_comments.count({
    where: {
      article: {
        id: props.articleId,
      },
    },
  });
  // Transform each comment using the transformer
  const transformedComments = await ArrayUtil.asyncMap(
    comments,
    EconomicDiscussionCommentAtSummaryTransformer.transform,
  );
  // Return the paginated response
  return {
    data: transformedComments,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
