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

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (props.body.section_id !== undefined) {
    const sectionExists =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          id: props.body.section_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!sectionExists) {
      throw new HttpException(
        "Invalid section_id: section does not exist or is deleted",
        400,
      );
    }
    whereInput.discussion_board_section_id = props.body.section_id;
  }
  if (props.body.author_id !== undefined) {
    const authorExists =
      await MyGlobal.prisma.discussion_board_members.findFirst({
        where: {
          id: props.body.author_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!authorExists) {
      throw new HttpException(
        "Invalid author_id: member does not exist or is deleted",
        400,
      );
    }
    whereInput.discussion_board_member_id = props.body.author_id;
  }
  if (props.body.tag_ids !== undefined && props.body.tag_ids.length > 0) {
    for (const tagId of props.body.tag_ids) {
      const tagExists = await MyGlobal.prisma.discussion_board_tags.findFirst({
        where: {
          id: tagId,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!tagExists) {
        throw new HttpException(
          "Invalid tag_id: tag does not exist or is deleted",
          400,
        );
      }
    }
    const tagFilters = props.body.tag_ids.map((tagId) => ({
      articleTags: {
        some: {
          discussion_board_tag_id: tagId,
        },
      },
    }));
    whereInput.AND = tagFilters;
  }
  if (props.body.from_date !== undefined && props.body.from_date !== null) {
    if (props.body.to_date !== undefined && props.body.to_date !== null) {
      whereInput.created_at = {
        gte: new Date(props.body.from_date),
        lte: new Date(props.body.to_date),
      };
    } else {
      whereInput.created_at = {
        gte: new Date(props.body.from_date),
      };
    }
  } else if (props.body.to_date !== undefined && props.body.to_date !== null) {
    whereInput.created_at = {
      lte: new Date(props.body.to_date),
    };
  }
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
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    {
      ...(sortBy === "createdAt" && { created_at: sortOrder }),
      ...(sortBy === "updatedAt" && { updated_at: sortOrder }),
      ...(sortBy === "title" && { title: sortOrder }),
    };
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
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
    },
    data: transformedData,
  };
}
