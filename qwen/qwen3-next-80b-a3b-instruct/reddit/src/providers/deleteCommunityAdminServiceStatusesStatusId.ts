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

export async function deleteCommunityAdminServiceStatusesStatusId(props: {
  admin: AdminPayload;
  statusId: string;
}): Promise<ICommunityServiceStatus> {
  const deleted = await MyGlobal.prisma.community_service_statuses.delete({
    where: {
      id: props.statusId,
      deleted_at: null, // Soft-delete check
    },
  });
  if (!deleted) {
    throw new HttpException("Service status not found or already deleted", 404);
  }
  return {
    id: deleted.id as string & tags.Format<"uuid">,
    service_name: deleted.service_name,
    status: deleted.status,
    last_checked: toISOStringSafe(deleted.last_checked),
    description: deleted.description,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at:
      deleted.deleted_at === null ? null : toISOStringSafe(deleted.deleted_at),
  };
}
