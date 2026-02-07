import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceAdminSystemStatusesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const status = await MyGlobal.prisma.ecommerce_system_statuses.findUnique({
    where: { id: props.id },
  });
  if (!status) {
    throw new HttpException("Not found", 404);
  }
  if (status.deleted_at !== null) {
    throw new HttpException("Already deleted", 400);
  }
  await MyGlobal.prisma.ecommerce_system_statuses.update({
    where: { id: props.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
