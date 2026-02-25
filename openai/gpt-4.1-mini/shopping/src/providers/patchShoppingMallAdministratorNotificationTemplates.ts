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
  const {
    templateCode,
    templateName,
    content,
    limit: rawLimit,
    sortBy,
    order,
    page: rawPage,
  } = props.body;
  const limit =
    rawLimit === undefined || rawLimit === null || rawLimit < 1 ? 20 : rawLimit;
  const page =
    rawPage === undefined || rawPage === null || rawPage < 1 ? 1 : rawPage;
  const where: Prisma.shopping_mall_notification_templatesWhereInput = {
    deleted_at: null,
  };
  if (
    templateCode !== undefined &&
    templateCode !== null &&
    templateCode.trim() !== ""
  ) {
    where.template_code = {
      contains: templateCode.trim(),
      mode: "insensitive",
    };
  }
  if (
    templateName !== undefined &&
    templateName !== null &&
    templateName.trim() !== ""
  ) {
    where.template_name = {
      contains: templateName.trim(),
      mode: "insensitive",
    };
  }
  if (content !== undefined && content !== null && content.trim() !== "") {
    where.content = {
      contains: content.trim(),
      mode: "insensitive",
    };
  }
  const validSortFields = new Set([
    "template_code",
    "template_name",
    "created_at",
    "updated_at",
  ]);
  const orderBy: Prisma.shopping_mall_notification_templatesOrderByWithRelationInput =
    sortBy && validSortFields.has(sortBy)
      ? { [sortBy]: order === "asc" ? "asc" : "desc" }
      : { created_at: "desc" };
  const skip = (page - 1) * limit;
  const total =
    await MyGlobal.prisma.shopping_mall_notification_templates.count({ where });
  const items =
    await MyGlobal.prisma.shopping_mall_notification_templates.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        template_code: true,
        template_name: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  function toDateTimeString(d: Date | null): string | null {
    return d === null ? null : d.toISOString();
  }
  const data: IShoppingMallNotificationTemplate.ISummary[] = items.map(
    (item) => ({
      id: item.id,
      template_code: item.template_code,
      template_name: item.template_name,
      content: item.content,
      created_at: toDateTimeString(item.created_at)!,
      updated_at: toDateTimeString(item.updated_at)!,
      deleted_at:
        item.deleted_at === null ? null : toDateTimeString(item.deleted_at),
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
