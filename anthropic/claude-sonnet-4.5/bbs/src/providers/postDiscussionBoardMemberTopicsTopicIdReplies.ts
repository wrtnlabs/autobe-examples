import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberTopicsTopicIdReplies(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.ICreate;
}): Promise<IDiscussionBoardReply> {
  const { member, topicId, body } = props;

  // Validate body.discussion_board_topic_id matches topicId parameter
  if (body.discussion_board_topic_id !== topicId) {
    throw new HttpException("Topic ID in body must match URL parameter", 400);
  }

  // Verify topic exists and is active
  const topic = await MyGlobal.prisma.discussion_board_topics.findFirst({
    where: {
      id: topicId,
      deleted_at: null,
    },
  });

  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }

  // Check topic status - must be active to allow replies
  if (topic.status === "locked") {
    throw new HttpException(
      "Topic is locked and does not accept new replies",
      403,
    );
  }

  if (topic.status === "archived") {
    throw new HttpException(
      "Topic is archived and does not accept new replies",
      403,
    );
  }

  // Calculate depth level based on parent reply if provided
  let depthLevel = 0;

  if (body.parent_reply_id !== null && body.parent_reply_id !== undefined) {
    const parentReply =
      await MyGlobal.prisma.discussion_board_replies.findFirst({
        where: {
          id: body.parent_reply_id,
          discussion_board_topic_id: topicId,
          deleted_at: null,
        },
      });

    if (!parentReply) {
      throw new HttpException("Parent reply not found", 404);
    }

    depthLevel = parentReply.depth_level + 1;

    // Enforce maximum threading depth constraint
    if (depthLevel > 10) {
      throw new HttpException(
        "Maximum threading depth of 10 levels exceeded",
        400,
      );
    }
  }

  // Generate current timestamp once for consistency
  const now = toISOStringSafe(new Date());

  // Create the reply with all required fields
  const created = await MyGlobal.prisma.discussion_board_replies.create({
    data: {
      id: v4(),
      discussion_board_topic_id: topicId,
      discussion_board_member_id: member.id,
      parent_reply_id: body.parent_reply_id ?? null,
      content: body.content,
      depth_level: depthLevel,
      created_at: now,
      updated_at: now,
    },
  });

  // Increment topic reply count and update last activity
  await MyGlobal.prisma.discussion_board_topics.update({
    where: { id: topicId },
    data: {
      reply_count: topic.reply_count + 1,
      updated_at: now,
    },
  });

  // Return the created reply with proper types
  return {
    id: created.id,
    discussion_board_topic_id: created.discussion_board_topic_id,
    discussion_board_member_id: created.discussion_board_member_id,
    parent_reply_id: created.parent_reply_id ?? undefined,
    content: created.content,
    depth_level: depthLevel,
    created_at: now,
    updated_at: now,
  };
}
