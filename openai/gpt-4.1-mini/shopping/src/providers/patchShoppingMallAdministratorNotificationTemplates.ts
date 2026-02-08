import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
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

export async function patchShoppingMallAdministratorNotificationTemplates(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationTemplate.IRequest;
}): Promise<IPageIShoppingMallNotificationTemplate.ISummary> {
  // Use fixed pagination parameters because props.body does not have page or limit
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
  } satisfies Prisma.shopping_mall_notification_templatesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_notification_templates.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        template_code: true,
        template_name: true,
        content: true,
        parameters: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_notification_templates.count({ where });
  return {
    data: data.map((record) => ({
      id: record.id,
      template_code: record.template_code,
      template_name: record.template_name,
      content: record.content,
      parameters: record.parameters,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
