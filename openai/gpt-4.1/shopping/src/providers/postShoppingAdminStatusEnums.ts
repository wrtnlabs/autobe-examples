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

export async function postShoppingAdminStatusEnums(props: {
  admin: AdminPayload;
  body: IShoppingStatusEnum.ICreate;
}): Promise<IShoppingStatusEnum> {
  const now = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.shopping_status_enums.create({
      data: {
        id: v4(),
        enum_domain: props.body.enum_domain,
        status_code: props.body.status_code,
        display_label: props.body.display_label,
        sort_order: props.body.sort_order,
        is_active: props.body.is_active,
        description: props.body.description ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      enum_domain: created.enum_domain,
      status_code: created.status_code,
      display_label: created.display_label,
      sort_order: created.sort_order,
      is_active: created.is_active,
      description: created.description ?? undefined,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate (enum_domain, status_code) not allowed",
        409,
      );
    }
    throw err;
  }
}
