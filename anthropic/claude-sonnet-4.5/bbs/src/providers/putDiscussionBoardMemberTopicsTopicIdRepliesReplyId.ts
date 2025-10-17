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

export async function putDiscussionBoardMemberTopicsTopicIdRepliesReplyId(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.IUpdate;
}): Promise<IDiscussionBoardReply> {
  const { member, topicId, replyId, body } = props;

  const reply = await MyGlobal.prisma.discussion_board_replies.findFirst({
    where: {
      id: replyId,
      discussion_board_topic_id: topicId,
    },
  });

  if (!reply) {
    throw new HttpException("Reply not found in the specified topic", 404);
  }

  if (reply.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only edit your own replies",
      403,
    );
  }

  const topic = await MyGlobal.prisma.discussion_board_topics.findFirst({
    where: {
      id: topicId,
    },
  });

  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }

  if (topic.status === "locked") {
    throw new HttpException("Cannot edit replies in locked topics", 423);
  }

  const currentTime = Date.now();
  const replyCreatedTime = new Date(reply.created_at).getTime();
  const hoursSinceCreation =
    (currentTime - replyCreatedTime) / (1000 * 60 * 60);

  const userReputation =
    await MyGlobal.prisma.discussion_board_user_reputation.findFirst({
      where: {
        discussion_board_member_id: member.id,
      },
    });

  const reputationScore = userReputation?.total_score ?? 0;
  const editWindowHours = reputationScore >= 100 ? 24 : 1;

  if (hoursSinceCreation > editWindowHours) {
    throw new HttpException(
      `Edit window expired. You can edit replies within ${editWindowHours} hour(s) of posting`,
      400,
    );
  }

  const previousContent = reply.content;
  const currentTimestamp = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_replies.update({
    where: {
      id: replyId,
    },
    data: {
      content: body.content ?? undefined,
      updated_at: currentTimestamp,
    },
  });

  await MyGlobal.prisma.discussion_board_edit_history.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: member.id,
      entity_type: "reply",
      entity_id: replyId,
      previous_content: previousContent,
      new_content: updated.content,
      edit_reason: undefined,
      created_at: currentTimestamp,
      deleted_at: undefined,
    },
  });

  await MyGlobal.prisma.discussion_board_topics.update({
    where: {
      id: topicId,
    },
    data: {
      updated_at: currentTimestamp,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    discussion_board_topic_id: updated.discussion_board_topic_id as string &
      tags.Format<"uuid">,
    discussion_board_member_id: updated.discussion_board_member_id as string &
      tags.Format<"uuid">,
    parent_reply_id:
      updated.parent_reply_id === null
        ? undefined
        : (updated.parent_reply_id as string & tags.Format<"uuid">),
    content: updated.content,
    depth_level: Number(updated.depth_level),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
