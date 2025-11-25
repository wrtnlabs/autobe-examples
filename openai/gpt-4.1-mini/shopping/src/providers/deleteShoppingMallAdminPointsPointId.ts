import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminPointsPointId(props: {
  admin: AdminPayload;
  pointId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_points.findUnique({
    where: { id: props.pointId },
  });

  if (!existing) {
    throw new HttpException("Point record not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_points.delete({
    where: { id: props.pointId },
  });
}
