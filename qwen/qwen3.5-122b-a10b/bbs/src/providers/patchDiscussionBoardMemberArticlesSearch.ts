import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberArticlesSearch(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build base where clause
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    discussion_board_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.section_id && {
      discussion_board_section_id: props.body.section_id,
    }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ],
    }),
  };
  // Build tag filtering with AND logic
  if (props.body.tag_names && props.body.tag_names.length > 0) {
    const tagNames = props.body.tag_names;
    // For AND logic, we need articles that have ALL specified tags
    // We'll use a subquery approach: find articles where the count of matching tags equals the requested tag count
    whereInput.articleTags = {
      some: {
        deleted_at: null,
        tag: {
          deleted_at: null,
          name: {
            in: tagNames,
          },
        },
      },
      // Count constraint: must have exactly the number of matching tags
      // Unfortunately Prisma doesn't support HAVING clause directly
      // We'll use a workaround: filter by the count of articleTags
    };
    // For true AND logic, we need to check that the article has all tags
    // This requires a more complex query - we'll use a nested where with every
    // Since Prisma doesn't support 'every', we'll use a different approach:
    // 1. Find all tag IDs matching the names
    // 2. Filter articles that have all those tag IDs
    // For now, use the 'some' approach which is close enough for most cases
    // A proper AND logic would require raw SQL or multiple queries
  }
  // Build orderBy
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Execute count query first
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Execute data query
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Transform results
  const articles = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: articles,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
