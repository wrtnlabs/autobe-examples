import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberTopicsTopicId(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, topicId } = props;

  const topic = await MyGlobal.prisma.discussion_board_topics.findUniqueOrThrow(
    {
      where: { id: topicId },
      select: {
        id: true,
        discussion_board_member_id: true,
        reply_count: true,
        created_at: true,
        deleted_at: true,
      },
    },
  );

  if (topic.deleted_at !== null) {
    throw new HttpException("Topic has already been deleted", 410);
  }

  if (topic.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own topics",
      403,
    );
  }

  if (topic.reply_count > 0) {
    throw new HttpException(
      "Cannot delete topic with existing replies. Topics with community engagement cannot be removed by authors.",
      403,
    );
  }

  const createdAtTimestamp = new Date(topic.created_at).getTime();
  const nowTimestamp = Date.now();
  const oneHourInMs = 60 * 60 * 1000;

  if (nowTimestamp - createdAtTimestamp > oneHourInMs) {
    throw new HttpException(
      "Deletion window expired. Topics can only be deleted within 1 hour of creation.",
      403,
    );
  }

  const currentTime = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_topics.update({
    where: { id: topicId },
    data: {
      deleted_at: currentTime,
      updated_at: currentTime,
    },
  });
}
