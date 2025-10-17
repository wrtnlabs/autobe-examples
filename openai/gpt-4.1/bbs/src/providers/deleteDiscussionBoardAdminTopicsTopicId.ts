import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminTopicsTopicId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check that the topic exists first
  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: {
      id: props.topicId,
    },
    select: { id: true },
  });
  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }
  // Only admin can access; since admin is required in props, no further check needed.
  await MyGlobal.prisma.discussion_board_topics.delete({
    where: {
      id: props.topicId,
    },
  });
}
