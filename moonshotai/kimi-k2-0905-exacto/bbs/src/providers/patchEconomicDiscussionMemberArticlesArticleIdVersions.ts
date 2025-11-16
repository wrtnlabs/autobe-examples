import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleVersion";
import { IPageIEconomicDiscussionArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticleVersion";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconomicDiscussionMemberArticlesArticleIdVersions(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionArticleVersion.IRequest;
}): Promise<IPageIEconomicDiscussionArticleVersion.ISummary> {
  const page = props.body.page ?? 0;
  const limit = props.body.limit ?? 10;
  const skip = page * limit;

  const orderByField = props.body.order_by ?? "created_at";
  const orderDirection: "asc" | "desc" = props.body.order_direction ?? "desc";

  const [versions, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_article_versions.findMany({
      where: {
        economic_discussion_article_id: props.articleId,
      },
      skip,
      take: limit,
      orderBy: {
        [orderByField]: orderDirection,
      },
    }),
    MyGlobal.prisma.economic_discussion_article_versions.count({
      where: {
        economic_discussion_article_id: props.articleId,
      },
    }),
  ]);

  return {
    data: versions.map((version) => ({
      id: version.id,
      economic_discussion_article_id: version.economic_discussion_article_id,
      version: version.version,
      created_at: toISOStringSafe(version.created_at),
    })),
    pagination: {
      current: String(page) as ICrIPageIntegerRequired,
      limit: String(limit) as ICrIPageIntegerRequired,
      records: String(total) as ICrIPageIntegerRequired,
      pages: String(Math.ceil(total / limit)) as ICrIPageIntegerRequired,
    },
  };
}
