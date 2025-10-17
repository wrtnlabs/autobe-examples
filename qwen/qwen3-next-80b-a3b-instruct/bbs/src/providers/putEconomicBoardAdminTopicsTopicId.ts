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

export async function putEconomicBoardAdminTopicsTopicId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
  body: IEconomicBoardTopic.IUpdate;
}): Promise<IEconomicBoardTopic> {
  // Verify admin has authorization to update this topic
  const topic = await MyGlobal.prisma.economic_board_topics.findUniqueOrThrow({
    where: {
      id: props.topicId,
    },
  });

  // Build update data object with satisfies for type safety
  // Only include fields that exist in IEconomicBoardTopic.IUpdate
  // description is optional - use undefined if not provided
  // is_active is optional - use undefined if not provided
  const updateData = {
    description: props.body.description, // Undefined if not provided
    is_active: props.body.is_active, // Undefined if not provided
  } satisfies IEconomicBoardTopic.IUpdate;

  // Perform update
  const updated = await MyGlobal.prisma.economic_board_topics.update({
    where: {
      id: props.topicId,
    },
    data: updateData,
  });

  // Return the updated topic with all fields properly typed
  return {
    id: updated.id,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    is_active: updated.is_active,
    description: updated.description,
  } satisfies IEconomicBoardTopic;
}
