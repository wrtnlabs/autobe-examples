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

export async function getCommunityAdminServiceStatusesStatusId(props: {
  admin: AdminPayload;
  statusId: string & tags.Format<"uuid">;
}): Promise<ICommunityServiceStatus> {
  const status = await MyGlobal.prisma.community_service_statuses.findUnique({
    where: {
      id: props.statusId,
      deleted_at: null,
    },
  });
  if (!status) {
    throw new HttpException("Service status not found", 404);
  }
  return {
    id: status.id,
    service_name: status.service_name,
    status: status.status,
    last_checked: status.last_checked,
    description: status.description,
    created_at: status.created_at,
    updated_at: status.updated_at,
  };
}
