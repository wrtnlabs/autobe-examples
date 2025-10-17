import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardWatchedTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWatchedTopic";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberUsersUserIdWatchedTopics(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardWatchedTopic.ICreate;
}): Promise<IDiscussionBoardWatchedTopic> {
  const { member, userId, body } = props;

  // Authorization: Verify member can only add topics to their own watch list
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only manage your own watched topics",
      403,
    );
  }

  // Verify topic exists and is accessible
  const topic = await MyGlobal.prisma.discussion_board_topics.findFirst({
    where: {
      id: body.discussion_board_topic_id,
      deleted_at: null,
    },
  });

  if (!topic) {
    throw new HttpException("Topic not found or has been deleted", 404);
  }

  // Prevent watching archived or deleted topics
  if (topic.status === "archived" || topic.status === "deleted") {
    throw new HttpException("Cannot watch archived or deleted topics", 400);
  }

  // Prevent users from watching their own topics
  if (topic.discussion_board_member_id === member.id) {
    throw new HttpException("You cannot watch your own topics", 400);
  }

  // Check if user is already watching this topic
  const existingWatch =
    await MyGlobal.prisma.discussion_board_watched_topics.findFirst({
      where: {
        discussion_board_member_id: member.id,
        discussion_board_topic_id: body.discussion_board_topic_id,
        deleted_at: null,
      },
    });

  if (existingWatch) {
    throw new HttpException("You are already watching this topic", 409);
  }

  // Prepare timestamp values once for reuse
  const now = toISOStringSafe(new Date());
  const watchId = v4() as string & tags.Format<"uuid">;

  // Create the watched topic relationship
  await MyGlobal.prisma.discussion_board_watched_topics.create({
    data: {
      id: watchId,
      discussion_board_member_id: member.id,
      discussion_board_topic_id: body.discussion_board_topic_id,
      created_at: now,
      updated_at: now,
      last_read_at: now,
    },
  });

  // Return using the same prepared values
  return {
    id: watchId,
    discussion_board_member_id: member.id,
    discussion_board_topic_id: body.discussion_board_topic_id,
    created_at: now,
    updated_at: now,
    last_read_at: now,
    deleted_at: undefined,
  };
}
