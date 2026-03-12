import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardTagsTagIdArticles(props: {
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  // Validate tag exists and is not soft-deleted
  await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
    where: {
      id: props.tagId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    articleTags: {
      some: {
        discussion_board_tag_id: props.tagId,
        tag: {
          deleted_at: null,
        },
      },
    },
  };
  // Apply search filter using contains for partial matching
  if (props.body.search !== undefined) {
    whereInput.OR = [
      {
        title: {
          contains: props.body.search,
        },
      },
      {
        content: {
          contains: props.body.search,
        },
      },
    ];
  }
  // Apply section filter
  if (props.body.section_id !== undefined) {
    whereInput.discussion_board_section_id = props.body.section_id;
    whereInput.section = {
      deleted_at: null,
    };
  }
  // Apply additional tag_ids filter (AND logic - article must have ALL specified tags)
  const andFilters: any[] = [];
  if (props.body.tag_ids !== undefined && props.body.tag_ids.length > 0) {
    const tagFilters = props.body.tag_ids.map((tagId) => ({
      articleTags: {
        some: {
          discussion_board_tag_id: tagId,
          tag: {
            deleted_at: null,
          },
        },
      },
    }));
    andFilters.push(...tagFilters);
  }
  if (andFilters.length > 0) {
    whereInput.AND = andFilters;
  }
  // Apply author filter
  if (props.body.author_id !== undefined) {
    whereInput.discussion_board_member_id = props.body.author_id;
  }
  // Apply date range filter
  if (props.body.from_date !== undefined && props.body.from_date !== null) {
    whereInput.created_at = {
      gte: new Date(props.body.from_date),
    };
  }
  if (props.body.to_date !== undefined && props.body.to_date !== null) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = {};
    }
    (whereInput.created_at as Prisma.DateTimeFilter).lte = new Date(
      props.body.to_date,
    );
  }
  // Build ORDER BY clause
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    sortBy === "createdAt"
      ? { created_at: sortOrder }
      : sortBy === "updatedAt"
        ? { updated_at: sortOrder }
        : { title: sortOrder };
  // Execute findMany query
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardArticle.ISummary;
}
