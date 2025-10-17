import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconomicBoardAdminTopicsTopicId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardTopic> {
  const topic = await MyGlobal.prisma.economic_board_topics.findUniqueOrThrow({
    where: { id: props.topicId },
  });

  return {
    id: topic.id,
    name: topic.name,
    created_at: toISOStringSafe(topic.created_at),
    updated_at: toISOStringSafe(topic.updated_at),
    is_active: topic.is_active,
    description: topic.description,
  };
}
