import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingStatusEnum";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminStatusEnumsEnumDomainStatusCode(props: {
  admin: AdminPayload;
  enumDomain: string;
  statusCode: string;
}): Promise<IShoppingStatusEnum> {
  const record = await MyGlobal.prisma.shopping_status_enums.findFirst({
    where: {
      enum_domain: props.enumDomain,
      status_code: props.statusCode,
      deleted_at: null,
    },
  });
  if (!record) {
    throw new HttpException("Status enum not found", 404);
  }
  return {
    id: record.id,
    enum_domain: record.enum_domain,
    status_code: record.status_code,
    display_label: record.display_label,
    sort_order: record.sort_order,
    is_active: record.is_active,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
