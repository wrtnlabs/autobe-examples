import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallNotificationCollector } from "../collectors/EcommerceMallNotificationCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { EcommerceMallNotificationTransformer } from "../transformers/EcommerceMallNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminNotifications(props: {
  superAdmin: SuperAdminPayload;
  body: IEcommerceMallNotification.ICreate;
}): Promise<IEcommerceMallNotification> {
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    await validateRecipients({
      recipients: props.body.recipients,
      transaction: tx,
    });
    const data = await EcommerceMallNotificationCollector.collect({
      body: props.body,
    });
    const created = await tx.ecommerce_mall_notifications.create({
      data,
      ...EcommerceMallNotificationTransformer.select(),
    });
    return created;
  });
  return EcommerceMallNotificationTransformer.transform(result);
}
async function validateRecipients(props: {
  recipients: IEcommerceMallNotification.ICreate["recipients"];
  transaction: Prisma.TransactionClient;
}) {
  if (!props.recipients || props.recipients.length === 0) return;
  const actorTypes = [
    "customer",
    "seller",
    "admin",
    "superAdmin",
    "guest",
  ] as const;
  for (const actorType of actorTypes) {
    const recipientList: IEcommerceMallNotification.IDeliverRecipient[] = [];
    for (const deliver of props.recipients) {
      for (const recipient of deliver.recipients) {
        if (recipient.recipient_type === actorType) {
          recipientList.push(recipient);
        }
      }
    }
    if (recipientList.length === 0) continue;
    const uniqueIds = [...new Set(recipientList.map((r) => r.recipient_id))];
    const tableMap: Record<string, string> = {
      customer: "ecommerce_mall_customers",
      seller: "ecommerce_mall_sellers",
      admin: "ecommerce_mall_admins",
      superAdmin: "ecommerce_mall_super_admins",
      guest: "ecommerce_mall_guests",
    };
    const actors = await (props.transaction as unknown as Record<string, any>)[
      tableMap[actorType]
    ].findMany({
      where: {
        id: { in: uniqueIds },
        deleted_at: null,
      },
      select: { id: true },
    });
    const actorIds = new Set(actors.map((a: { id: string }) => a.id));
    for (const recipient of recipientList) {
      if (!actorIds.has(recipient.recipient_id)) {
        throw new HttpException(
          `${actorType.charAt(0).toUpperCase() + actorType.slice(1)} not found: ${recipient.recipient_id}`,
          404,
        );
      }
    }
  }
}
