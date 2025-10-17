import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function patchDiscussionBoardTopics(props: {
  body: IDiscussionBoardTopic.IRequest;
}): Promise<IPageIDiscussionBoardTopic.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.category_id !== undefined &&
      body.category_id !== null && {
        discussion_board_category_id: body.category_id,
      }),
    ...(body.author_id !== undefined &&
      body.author_id !== null && {
        discussion_board_member_id: body.author_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        OR: [
          { title: { contains: body.search } },
          { body: { contains: body.search } },
        ],
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
    ...(body.tag_ids !== undefined &&
      body.tag_ids !== null &&
      body.tag_ids.length > 0 && {
        discussion_board_topic_tags: {
          some: {
            discussion_board_tag_id: {
              in: body.tag_ids,
            },
          },
        },
      }),
  };

  const sortBy = body.sort_by ?? "recent_activity";
  const orderByClause =
    sortBy === "newest"
      ? { created_at: "desc" as const }
      : sortBy === "most_replies"
        ? { reply_count: "desc" as const }
        : sortBy === "most_views"
          ? { view_count: "desc" as const }
          : sortBy === "hot"
            ? { updated_at: "desc" as const }
            : sortBy === "top"
              ? { reply_count: "desc" as const }
              : { updated_at: "desc" as const };

  const [topics, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_topics.findMany({
      where: whereCondition,
      include: {
        category: true,
        author: true,
      },
      orderBy: orderByClause,
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_topics.count({
      where: whereCondition,
    }),
  ]);

  const data = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    category: {
      id: topic.category.id,
      name: topic.category.name,
      slug: topic.category.slug,
    },
    author: {
      id: topic.author.id,
      username: topic.author.username,
      display_name: topic.author.display_name ?? null,
      avatar_url: topic.author.avatar_url ?? null,
    },
    status: topic.status as "active" | "locked" | "archived" | "deleted",
    view_count: topic.view_count,
    reply_count: topic.reply_count,
    is_pinned: topic.is_pinned,
    created_at: toISOStringSafe(topic.created_at),
    updated_at: toISOStringSafe(topic.updated_at),
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data: data,
  };
}
