import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallNotificationTemplateCollector } from "../collectors/ShoppingMallNotificationTemplateCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorNotificationTemplates(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationTemplate.ICreate;
}): Promise<IShoppingMallNotificationTemplate> {
  // Collect full data
  const data = await ShoppingMallNotificationTemplateCollector.collect({
    body: props.body,
  });
  // Extract required unique key
  const template_code = data.template_code as unknown as string;
  // Check for existing record
  const existing =
    await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
      where: { template_code },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException(
      `Template code already exists: ${template_code}`,
      409,
    );
  }
  // Prepare timestamps
  const now = toISOStringSafe(new Date());
  const id = v4();
  // Destructure required template fields
  const { template_code: tc, template_name, content, parameters } = data;
  try {
    const created =
      await MyGlobal.prisma.shopping_mall_notification_templates.create({
        data: {
          id,
          template_code: tc as string,
          template_name: template_name as string,
          content: content as string,
          parameters: parameters as string,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return created;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Duplicate template_code", 409);
    }
    throw error;
  }
}
