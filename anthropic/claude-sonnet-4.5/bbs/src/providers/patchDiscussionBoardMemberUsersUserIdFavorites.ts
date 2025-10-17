import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFavorite";
import { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberUsersUserIdFavorites(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardFavorite.IRequest;
}): Promise<IPageIDiscussionBoardTopic.ISummary> {
  const { member, userId, body } = props;

  const targetUser = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
    select: {
      id: true,
      activity_visibility: true,
    },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  const isOwner = member.id === userId;

  if (!isOwner) {
    if (targetUser.activity_visibility === "private") {
      throw new HttpException(
        "Unauthorized: This user's favorites are private",
        403,
      );
    }
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const topicSearchFilter =
    body.search !== undefined && body.search !== null && body.search.length > 0
      ? {
          OR: [
            { title: { contains: body.search } },
            { body: { contains: body.search } },
          ],
        }
      : {};

  const sortBy = body.sort_by ?? "date_favorited_desc";

  let orderByClause = {};

  if (sortBy === "date_favorited_desc") {
    orderByClause = { created_at: "desc" as const };
  } else if (sortBy === "date_favorited_asc") {
    orderByClause = { created_at: "asc" as const };
  } else {
    orderByClause = { created_at: "desc" as const };
  }

  const [favorites, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_favorites.findMany({
      where: {
        discussion_board_member_id: userId,
        deleted_at: null,
        topic: {
          deleted_at: null,
          ...topicSearchFilter,
        },
      },
      include: {
        topic: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            author: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
      orderBy: orderByClause,
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_favorites.count({
      where: {
        discussion_board_member_id: userId,
        deleted_at: null,
        topic: {
          deleted_at: null,
          ...topicSearchFilter,
        },
      },
    }),
  ]);

  let sortedFavorites = favorites;

  if (sortBy === "topic_created_desc") {
    sortedFavorites = [...favorites].sort(
      (a, b) => b.topic.created_at.getTime() - a.topic.created_at.getTime(),
    );
  } else if (sortBy === "topic_activity_desc") {
    sortedFavorites = [...favorites].sort(
      (a, b) => b.topic.updated_at.getTime() - a.topic.updated_at.getTime(),
    );
  } else if (sortBy === "reply_count_desc") {
    sortedFavorites = [...favorites].sort(
      (a, b) => b.topic.reply_count - a.topic.reply_count,
    );
  }

  const topicSummaries = sortedFavorites.map((fav) => {
    const topic = fav.topic;

    return {
      id: topic.id as string & tags.Format<"uuid">,
      title: topic.title,
      category: {
        id: topic.category.id as string & tags.Format<"uuid">,
        name: topic.category.name,
        slug: topic.category.slug,
      },
      author: {
        id: topic.author.id as string & tags.Format<"uuid">,
        username: topic.author.username,
        display_name: topic.author.display_name,
        avatar_url: topic.author.avatar_url
          ? (topic.author.avatar_url as string & tags.Format<"uri">)
          : null,
      },
      status: topic.status as "active" | "locked" | "archived" | "deleted",
      view_count: topic.view_count,
      reply_count: topic.reply_count,
      is_pinned: topic.is_pinned,
      created_at: toISOStringSafe(topic.created_at),
      updated_at: toISOStringSafe(topic.updated_at),
    };
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data: topicSummaries,
  };
}
