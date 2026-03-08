import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformWebhook";
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

export async function postRedditPlatformAdminWebhooks(props: {
  admin: AdminPayload;
  body: IRedditPlatformWebhook.ICreate;
}): Promise<IRedditPlatformWebhook.ICreate> {
  const { endpointUrl, eventTypes } = props.body;
  const url = new URL(endpointUrl);
  if (url.protocol !== "https:") {
    throw new HttpException("Endpoint URL must use HTTPS protocol", 400);
  }
  const supportedEventTypes = [
    "post.created",
    "post.deleted",
    "comment.created",
    "comment.deleted",
    "vote.applied",
    "community.created",
    "community.subscription_added",
    "report.created",
  ];
  for (const eventType of eventTypes) {
    if (!supportedEventTypes.includes(eventType)) {
      throw new HttpException(`Unsupported event type: ${eventType}`, 400);
    }
  }
  const webhookId: string & tags.Format<"uuid"> = v4();
  v4();
  return {
    endpointUrl,
    eventTypes,
  };
}
