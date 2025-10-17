import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardWatchedTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWatchedTopic";
import { IPageIDiscussionBoardWatchedTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWatchedTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberUsersUserIdWatchedTopics(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardWatchedTopic.IRequest;
}): Promise<IPageIDiscussionBoardWatchedTopic.ISummary> {
  const { member, userId, body } = props;

  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only view your own watched topics",
      403,
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const createdAtRange: { gte?: string; lte?: string } = {};
  if (body.watched_after !== undefined && body.watched_after !== null) {
    createdAtRange.gte = body.watched_after;
  }
  if (body.watched_before !== undefined && body.watched_before !== null) {
    createdAtRange.lte = body.watched_before;
  }

  const [watchedTopics, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_watched_topics.findMany({
      where: {
        discussion_board_member_id: userId,
        deleted_at: null,
        ...(Object.keys(createdAtRange).length > 0 && {
          created_at: createdAtRange,
        }),
        topic: {
          deleted_at: null,
          ...(body.category_filter !== undefined &&
            body.category_filter !== null && {
              category: {
                name: {
                  contains: body.category_filter,
                },
              },
            }),
          ...(body.topic_title_search !== undefined &&
            body.topic_title_search !== null && {
              title: {
                contains: body.topic_title_search,
              },
            }),
        },
      },
      include: {
        topic: {
          include: {
            category: true,
          },
        },
      },
      orderBy:
        body.sort_by === "topic_updated_at"
          ? {
              topic: { updated_at: body.sort_order === "asc" ? "asc" : "desc" },
            }
          : body.sort_by === "topic_reply_count"
            ? {
                topic: {
                  reply_count: body.sort_order === "asc" ? "asc" : "desc",
                },
              }
            : body.sort_by === "last_read_at"
              ? { last_read_at: body.sort_order === "asc" ? "asc" : "desc" }
              : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_watched_topics.count({
      where: {
        discussion_board_member_id: userId,
        deleted_at: null,
        ...(Object.keys(createdAtRange).length > 0 && {
          created_at: createdAtRange,
        }),
        topic: {
          deleted_at: null,
          ...(body.category_filter !== undefined &&
            body.category_filter !== null && {
              category: {
                name: {
                  contains: body.category_filter,
                },
              },
            }),
          ...(body.topic_title_search !== undefined &&
            body.topic_title_search !== null && {
              title: {
                contains: body.topic_title_search,
              },
            }),
        },
      },
    }),
  ]);

  let results = watchedTopics.map((wt) => {
    const lastReadTime =
      wt.last_read_at !== null && wt.last_read_at !== undefined
        ? new Date(wt.last_read_at).getTime()
        : null;
    const topicUpdatedTime = new Date(wt.topic.updated_at).getTime();
    const hasUnreadActivity =
      lastReadTime === null ? true : topicUpdatedTime > lastReadTime;

    return {
      id: wt.id as string & tags.Format<"uuid">,
      discussion_board_member_id: wt.discussion_board_member_id as string &
        tags.Format<"uuid">,
      discussion_board_topic_id: wt.discussion_board_topic_id as string &
        tags.Format<"uuid">,
      topic_title: wt.topic.title,
      topic_category: wt.topic.category.name,
      created_at: toISOStringSafe(wt.created_at),
      last_read_at:
        wt.last_read_at !== null && wt.last_read_at !== undefined
          ? toISOStringSafe(wt.last_read_at)
          : null,
      has_unread_activity: hasUnreadActivity,
      topic_reply_count: wt.topic.reply_count,
      topic_updated_at: toISOStringSafe(wt.topic.updated_at),
    };
  });

  if (
    body.has_unread_activity !== undefined &&
    body.has_unread_activity !== null
  ) {
    results = results.filter(
      (r) => r.has_unread_activity === body.has_unread_activity,
    );
  }

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results,
  };
}
