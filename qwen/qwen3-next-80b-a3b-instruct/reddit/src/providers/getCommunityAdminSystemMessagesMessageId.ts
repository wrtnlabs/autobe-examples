import { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunitySystemMessageTransformer } from "../transformers/CommunitySystemMessageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminSystemMessagesMessageId(props: {
  admin: AdminPayload;
  messageId: string & tags.Format<"uuid">;
}): Promise<ICommunitySystemMessage> {
  const now = toISOStringSafe(new Date());
  const message = await MyGlobal.prisma.community_system_messages.findUnique({
    where: {
      id: props.messageId,
      status: "published",
      published_at: { lte: now },
      OR: [{ visible_until: { gte: now } }, { visible_until: null }],
    },
    ...CommunitySystemMessageTransformer.select(),
  });
  if (!message) {
    throw new HttpException("Message not found or not visible", 404);
  }
  return await CommunitySystemMessageTransformer.transform(message);
}
