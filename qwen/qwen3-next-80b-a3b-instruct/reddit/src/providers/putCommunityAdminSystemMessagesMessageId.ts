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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityAdminSystemMessagesMessageId(props: {
  admin: AdminPayload;
  messageId: string;
  body: ICommunitySystemMessage.IUpdate;
}): Promise<ICommunitySystemMessage> {
  // Ensure the system message exists
  const message = await MyGlobal.prisma.community_system_messages.findUnique({
    where: { id: props.messageId },
  });
  if (!message) {
    throw new HttpException("System message not found", 404);
  }
  // Update the message with provided body and updated_at timestamp
  const updatedMessage = await MyGlobal.prisma.community_system_messages.update(
    {
      where: { id: props.messageId },
      data: {
        ...props.body,
        updated_at: new Date(),
      },
    },
  );
  // Convert all Date fields to string & tags.Format<'date-time'>
  return {
    id: updatedMessage.id,
    title: updatedMessage.title,
    content: updatedMessage.content,
    created_at: toISOStringSafe(updatedMessage.created_at),
    updated_at: toISOStringSafe(updatedMessage.updated_at),
    published_at: toISOStringSafe(updatedMessage.published_at),
    visible_until: updatedMessage.visible_until
      ? toISOStringSafe(updatedMessage.visible_until)
      : null,
    status: typia.assert<"draft" | "published" | "archived">(
      updatedMessage.status,
    ),
  };
}
