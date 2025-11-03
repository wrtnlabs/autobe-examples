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

export async function putShoppingAdminStatusEnumsEnumDomainStatusCode(props: {
  admin: AdminPayload;
  enumDomain: string;
  statusCode: string;
  body: IShoppingStatusEnum.IUpdate;
}): Promise<IShoppingStatusEnum> {
  const now = toISOStringSafe(new Date());
  // Fetch existing row to verify existence (404 if not found, or soft-deleted)
  const original = await MyGlobal.prisma.shopping_status_enums.findFirst({
    where: {
      enum_domain: props.enumDomain,
      status_code: props.statusCode,
      deleted_at: null,
    },
  });
  if (!original) {
    throw new HttpException("Status enum not found", 404);
  }
  // Perform update
  const updated = await MyGlobal.prisma.shopping_status_enums.update({
    where: {
      id: original.id,
    },
    data: {
      display_label: props.body.display_label,
      sort_order: props.body.sort_order,
      is_active: props.body.is_active,
      description:
        props.body.description !== undefined
          ? props.body.description
          : undefined,
      updated_at: now,
    },
  });
  // Prepare DTO return with correct nullable/optional field mapping
  return {
    id: updated.id,
    enum_domain: updated.enum_domain,
    status_code: updated.status_code,
    display_label: updated.display_label,
    sort_order: updated.sort_order,
    is_active: updated.is_active,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
