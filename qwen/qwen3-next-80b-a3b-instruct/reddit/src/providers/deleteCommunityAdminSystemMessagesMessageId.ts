import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityAdminSystemMessagesMessageId(props: {
  admin: AdminPayload;
  messageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const message = await MyGlobal.prisma.community_system_messages.findUnique({
    where: { id: props.messageId },
  });
  if (!message) {
    throw new HttpException("System message not found", 404);
  }
  await MyGlobal.prisma.community_system_messages.delete({
    where: { id: props.messageId },
  });
}
