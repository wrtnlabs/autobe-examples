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

export async function deleteShoppingMallAdministratorNotificationTemplatesNotificationTemplateId(props: {
  administrator: AdministratorPayload;
  notificationTemplateId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.shopping_mall_notification_templates.delete({
      where: { id: props.notificationTemplateId },
    });
  } catch (error) {
    // Prisma throws Prisma.PrismaClientKnownRequestError on not found
    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as {
        code?: string;
      };
      // P2025 is 'Record to delete does not exist.'
      if (prismaError.code === "P2025") {
        throw new HttpException("Notification Template not found", 404);
      }
    }
    throw error;
  }
}
