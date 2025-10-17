import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import { IPageIDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReply";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardTopicsTopicIdReplies(props: {
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.IRequest;
}): Promise<IPageIDiscussionBoardReply> {
  const { topicId, body } = props;

  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 50) as number;
  const skip = (page - 1) * limit;

  let authorIdFilter: string | undefined = undefined;
  if (body.author_username !== undefined && body.author_username !== null) {
    const author = await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { username: body.author_username },
      select: { id: true },
    });

    if (author === null) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }

    authorIdFilter = author.id;
  }

  const [replies, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_replies.findMany({
      where: {
        discussion_board_topic_id: topicId,
        ...(body.include_deleted !== true && { deleted_at: null }),
        ...(authorIdFilter !== undefined && {
          discussion_board_member_id: authorIdFilter,
        }),
        ...(body.parent_reply_id !== undefined &&
          body.parent_reply_id !== null && {
            parent_reply_id: body.parent_reply_id,
          }),
        ...(body.content_search !== undefined &&
          body.content_search !== null && {
            content: {
              contains: body.content_search,
            },
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
        ...((body.min_depth_level !== undefined &&
          body.min_depth_level !== null) ||
        (body.max_depth_level !== undefined && body.max_depth_level !== null)
          ? {
              depth_level: {
                ...(body.min_depth_level !== undefined &&
                  body.min_depth_level !== null && {
                    gte: body.min_depth_level,
                  }),
                ...(body.max_depth_level !== undefined &&
                  body.max_depth_level !== null && {
                    lte: body.max_depth_level,
                  }),
              },
            }
          : {}),
      },
      orderBy:
        body.sort_by === "created_at_asc"
          ? { created_at: "asc" }
          : body.sort_by === "created_at_desc"
            ? { created_at: "desc" }
            : body.sort_by === "depth_level_asc"
              ? { depth_level: "asc" }
              : body.sort_by === "vote_score_desc"
                ? { created_at: "desc" }
                : { created_at: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_replies.count({
      where: {
        discussion_board_topic_id: topicId,
        ...(body.include_deleted !== true && { deleted_at: null }),
        ...(authorIdFilter !== undefined && {
          discussion_board_member_id: authorIdFilter,
        }),
        ...(body.parent_reply_id !== undefined &&
          body.parent_reply_id !== null && {
            parent_reply_id: body.parent_reply_id,
          }),
        ...(body.content_search !== undefined &&
          body.content_search !== null && {
            content: {
              contains: body.content_search,
            },
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
        ...((body.min_depth_level !== undefined &&
          body.min_depth_level !== null) ||
        (body.max_depth_level !== undefined && body.max_depth_level !== null)
          ? {
              depth_level: {
                ...(body.min_depth_level !== undefined &&
                  body.min_depth_level !== null && {
                    gte: body.min_depth_level,
                  }),
                ...(body.max_depth_level !== undefined &&
                  body.max_depth_level !== null && {
                    lte: body.max_depth_level,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data = replies.map((reply) => ({
    id: reply.id,
    discussion_board_topic_id: reply.discussion_board_topic_id,
    discussion_board_member_id: reply.discussion_board_member_id,
    parent_reply_id: reply.parent_reply_id ?? undefined,
    content: reply.content,
    depth_level: reply.depth_level,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
