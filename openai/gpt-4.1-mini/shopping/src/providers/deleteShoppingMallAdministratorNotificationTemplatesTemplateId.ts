import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallAdministratorNotificationTemplatesTemplateId(props: {
  administrator: AdministratorPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the notification template exists, throws 404 if not
  await MyGlobal.prisma.shopping_mall_notification_templates.findUniqueOrThrow({
    where: { id: props.templateId },
  });
  // Delete the notification template record permanently
  await MyGlobal.prisma.shopping_mall_notification_templates.delete({
    where: { id: props.templateId },
  });
}
