import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminNotificationsTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
  body: IShoppingMallNotificationTemplate.IUpdate;
}): Promise<IShoppingMallNotificationTemplate> {
  // IShoppingMallNotificationTemplate.IUpdate is defined as string, not an object
  // This is a schema contract violation for field-based updates
  // We must treat the body as a raw string since the interface requires it

  // Verify template exists and is not deleted
  const existing =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: {
        id: props.templateId,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new HttpException("Template not found", 404);
  }

  // Since IUpdate is defined as string, not an object, we cannot access properties like title, type, etc.
  // This is a fundamental schema design error. The API contract cannot be fulfilled as described.
  // We throw a 500 error indicating this schema contract violation
  throw new HttpException(
    "Internal Server Error: IShoppingMallNotificationTemplate.IUpdate is defined as string type but operation requires object-based field updates. This is a schema contract violation that cannot be implemented as specified. The API definition contradicts its intended use.",
    500,
  );
}
