import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminActivitiesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminActivity> {
  const { id } = props;
  const record =
    await MyGlobal.prisma.shopping_mall_admin_activities.findFirstOrThrow({
      where: { id },
      select: {
        id: true,
        shopping_mall_admin_id: true,
        activity: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: record.id,
    shopping_mall_admin_id: record.shopping_mall_admin_id,
    activity: record.activity,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
