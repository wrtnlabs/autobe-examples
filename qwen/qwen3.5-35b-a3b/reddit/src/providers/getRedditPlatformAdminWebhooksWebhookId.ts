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

export async function getRedditPlatformAdminWebhooksWebhookId(props: {
  admin: AdminPayload;
  webhookId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformWebhook> {
  // Query webhook configuration from external storage
  // Note: Webhooks are stored in external configuration storage (Redis/external service)
  // as per section 481 (Webhook Event Management)
  const webhookConfig = await MyGlobal.prisma.$queryRaw<
    [
      {
        id: string;
        endpointUrl: string;
        eventTypes: string;
        verificationStatus: string;
        createdAt: string;
        updatedAt: string;
        lastDeliveryAt: string | null;
        totalDeliveries: number;
        failedDeliveries: number;
      },
    ]
  >`SELECT
  id,
  endpoint_url AS "endpointUrl",
  event_types AS "eventTypes",
  verification_status AS "verificationStatus",
  created_at AS "createdAt",
  updated_at AS "updatedAt",
  last_delivery_at AS "lastDeliveryAt",
  total_deliveries AS "totalDeliveries",
  failed_deliveries AS "failedDeliveries"
FROM reddit_platform_webhooks
WHERE id = ${props.webhookId}`;
  if (webhookConfig.length !== 1) {
    throw new HttpException("Webhook not found", 404);
  }
  const webhook = webhookConfig[0];
  // Verify admin has permission to access this webhook
  const webhookOwnerResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        owner_id: string;
      },
    ]
  >`SELECT owner_id
FROM reddit_platform_webhooks
WHERE id = ${props.webhookId}`;
  const webhookOwner = webhookOwnerResult[0];
  if (webhookOwner === null || webhookOwner.owner_id === undefined) {
    throw new HttpException("Webhook not found", 404);
  }
  if (webhookOwner.owner_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: webhook.id,
    endpointUrl: webhook.endpointUrl,
    eventTypes: JSON.parse(webhook.eventTypes) as string[],
    verificationStatus: webhook.verificationStatus as "confirmed" | "pending",
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
    lastDeliveryAt:
      webhook.lastDeliveryAt !== null ? webhook.lastDeliveryAt : null,
    totalDeliveries: webhook.totalDeliveries,
    failedDeliveries: webhook.failedDeliveries,
  } satisfies IRedditPlatformWebhook;
}
