import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function getDiscussionBoardTopicsTopicId(props: {
  topicId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTopic> {
  const { topicId } = props;

  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: topicId },
    include: {
      category: true,
      author: true,
      discussion_board_topic_tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }

  if (topic.deleted_at !== null) {
    throw new HttpException("Topic not found", 404);
  }

  return {
    id: topic.id as string & tags.Format<"uuid">,
    title: topic.title,
    body: topic.body,
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
    tags: topic.discussion_board_topic_tags.map((topicTag) => ({
      id: topicTag.tag.id as string & tags.Format<"uuid">,
      name: topicTag.tag.name,
    })),
    status: topic.status as "active" | "locked" | "archived" | "deleted",
    view_count: topic.view_count,
    reply_count: topic.reply_count,
    is_pinned: topic.is_pinned,
    created_at: toISOStringSafe(topic.created_at),
    updated_at: toISOStringSafe(topic.updated_at),
  };
}
