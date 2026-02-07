import { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
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

export async function putEcommerceAdminSystemStatusesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IEcommerceSystemStatus.IUpdate;
}): Promise<IEcommerceSystemStatus> {
  const existingStatus =
    await MyGlobal.prisma.ecommerce_system_statuses.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        status: true,
        health_score: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!existingStatus) {
    throw new HttpException("System status record not found", 404);
  }
  await MyGlobal.prisma.ecommerce_snapshots.create({
    data: {
      id: v4(),
      table_name: "ecommerce_system_statuses",
      record_id: props.id,
      before_data: JSON.stringify(existingStatus),
      actor_id: props.admin.id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updatedStatus = await MyGlobal.prisma.ecommerce_system_statuses.update({
    where: { id: props.id },
    data: {
      status: props.body.status,
      health_score: props.body.health_score,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const snapshot = await MyGlobal.prisma.ecommerce_snapshots.findFirst({
    where: { record_id: props.id },
    orderBy: { created_at: "desc" },
  });
  if (!snapshot) {
    throw new HttpException("Snapshot record not found", 404);
  }
  await MyGlobal.prisma.ecommerce_snapshots.update({
    where: { id: snapshot.id },
    data: {
      after_data: JSON.stringify(updatedStatus),
    },
  });
  return {
    status: updatedStatus.status,
    health_score: updatedStatus.health_score,
    created_at: toISOStringSafe(updatedStatus.created_at),
    updated_at: toISOStringSafe(updatedStatus.updated_at),
    id: updatedStatus.id as string & tags.Format<"uuid">,
  };
}
