import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getPoliticsBbsMemberMembersMeArticles(props: {
  member: MemberPayload;
}): Promise<IPoliticsBbsArticle.ISummaryList> {
  // No pagination parameters from request for this endpoint per specs
  const page = 1; // Default to first page
  const limit = 20; // Standard page size
  const skip = (page - 1) * limit;

  // Fetch member's articles with category data
  const [articles, total] = await Promise.all([
    MyGlobal.prisma.politics_bbs_articles.findMany({
      where: {
        politics_bbs_creator_id: props.member.id,
        deleted_at: null,
      },
      include: {
        category: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.politics_bbs_articles.count({
      where: {
        politics_bbs_creator_id: props.member.id,
        deleted_at: null,
      },
    }),
  ]);

  return {
    data: articles.map((article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      content: article.content,
      state: article.state,
      view_count: article.view_count as number & tags.Type<"int32">,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      category: {
        id: article.category.id as string & tags.Format<"uuid">,
        code: article.category.code,
        name: article.category.name,
        created_at: toISOStringSafe(article.category.created_at),
        updated_at: article.category.updated_at
          ? toISOStringSafe(article.category.updated_at)
          : null,
        deleted_at: article.category.deleted_at
          ? toISOStringSafe(article.category.deleted_at)
          : null,
        sequence: article.category.sequence as number & tags.Type<"int32">,
        primary: article.category.primary,
        required: article.category.required,
        multiplicative: article.category.multiplicative,
        color: article.category.color,
        icon: article.category.icon,
        description: article.category.description,
      },
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
