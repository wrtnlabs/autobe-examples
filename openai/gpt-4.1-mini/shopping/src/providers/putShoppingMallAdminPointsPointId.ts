import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPoint";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminPointsPointId(props: {
  admin: AdminPayload;
  pointId: string & tags.Format<"uuid">;
  body: IShoppingMallPoint.IUpdate;
}): Promise<IShoppingMallPoint> {
  const existing = await MyGlobal.prisma.shopping_mall_points.findUnique({
    where: { id: props.pointId },
  });

  if (!existing) {
    throw new HttpException("Point record not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_points.update({
    where: { id: props.pointId },
    data: {
      balance: props.body.balance ?? undefined,
      deleted_at:
        props.body.deleted_at === undefined ? undefined : props.body.deleted_at,
    },
  });

  return {
    id: updated.id,
    balance: updated.balance,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
