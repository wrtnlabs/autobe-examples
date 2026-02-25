import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorNotificationsSend(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationTemplate.ISendRequest;
}): Promise<IShoppingMallNotificationTemplate.ISendResult> {
  const { templateCode, content, parameters, recipients, channel } = props.body;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new HttpException(
      "Recipients list must contain at least one recipient.",
      400,
    );
  }
  const nowISOString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const createUuid = (): string & tags.Format<"uuid"> => v4();
  try {
    const deliveriesData = recipients.map((recipient) => ({
      id: createUuid(),
      recipient: recipient,
      channel: channel,
      status: "pending",
      attempted_at: null,
      shopping_mall_user_notification_id: "",
      shopping_mall_notification_template_id: templateCode ?? "",
      created_at: nowISOString,
      updated_at: nowISOString,
    }));
    await MyGlobal.prisma.shopping_mall_notification_deliveries.createMany({
      data: deliveriesData,
    });
    await MyGlobal.prisma.shopping_mall_notification_logs.create({
      data: {
        id: createUuid(),
        message: null,
        created_at: nowISOString,
      },
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message };
  }
}
