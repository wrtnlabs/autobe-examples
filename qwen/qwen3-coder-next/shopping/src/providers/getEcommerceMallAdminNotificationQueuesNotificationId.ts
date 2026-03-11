import { IEcommerceMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotificationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallNotificationQueueTransformer } from "../transformers/EcommerceMallNotificationQueueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminNotificationQueuesNotificationId(props: {
  admin: AdminPayload;
  notificationId: string;
}): Promise<IEcommerceMallNotificationQueue> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notification_queues.findUniqueOrThrow({
      where: { id: props.notificationId },
      ...EcommerceMallNotificationQueueTransformer.select(),
    });
  return await EcommerceMallNotificationQueueTransformer.transform(
    notification,
  );
}
