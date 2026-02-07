import { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
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

export async function putCommunityAdminServiceStatusesStatusId(props: {
  admin: AdminPayload;
  statusId: string;
  body: ICommunityServiceStatus;
}): Promise<ICommunityServiceStatus> {
  // Find the service status record by statusId
  const serviceStatus =
    await MyGlobal.prisma.community_service_statuses.findUnique({
      where: {
        id: props.statusId,
        deleted_at: null,
      },
    });
  // Return 404 if not found
  if (!serviceStatus) {
    throw new HttpException("Service status not found", 404);
  }
  // Update the record with new values
  const updated = await MyGlobal.prisma.community_service_statuses.update({
    where: {
      id: props.statusId,
      deleted_at: null,
    },
    data: {
      status: props.body.status,
      description: props.body.description,
      last_checked: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      service_name: true,
      status: true,
      last_checked: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Return the full updated record
  return {
    id: updated.id,
    service_name: updated.service_name,
    status: updated.status,
    last_checked: updated.last_checked,
    description: updated.description,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
  };
}
