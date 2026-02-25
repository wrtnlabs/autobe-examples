import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticles(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  // Validate and set pagination defaults
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  // Build base where filter for active articles
  const where: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  // Search filter on title or content with case-insensitive contains
  if (props.body.search) {
    where.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { content: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Filter by sectionId if provided
  if (props.body.sectionId) {
    where.section_id = props.body.sectionId;
  }
  // Apply tag filters if provided
  const tagsFilter =
    props.body.tags && props.body.tags.length > 0 ? props.body.tags : undefined;
  if (tagsFilter) {
    where.AND = tagsFilter.map((tagId) => ({
      tagMappings: { some: { discussion_board_tag_id: tagId } },
    }));
  }
  // Determine orderBy for sorting
  const orderBy: Prisma.discussion_board_articlesOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Execute findMany query with pagination and eager loading
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Count total matching records for pagination metadata
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where,
  });
  // Transform raw DB results into API DTOs
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
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
