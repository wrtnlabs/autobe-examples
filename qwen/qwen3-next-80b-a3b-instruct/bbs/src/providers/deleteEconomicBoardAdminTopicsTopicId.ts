import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconomicBoardAdminTopicsTopicId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { topicId } = props;

  // Verify topic exists
  const topic = await MyGlobal.prisma.economic_board_topics.findUnique({
    where: { id: topicId },
  });

  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }

  // Check for any associated posts
  const postCount = await MyGlobal.prisma.economic_board_posts.count({
    where: { economic_board_topics_id: topicId },
  });

  // Business rule: Must have zero associated posts to delete
  if (postCount > 0) {
    throw new HttpException("Cannot delete topic: Associated posts exist", 409);
  }

  // Perform hard delete
  await MyGlobal.prisma.economic_board_topics.delete({
    where: { id: topicId },
  });
}
