import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingOwnerOrganizationsOrganizationId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirst({
      where: {
        id: props.owner.session_id,
        hrm_time_tracking_owner_id: props.owner.id,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (session === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.hrm_time_tracking_organization_id === null) {
    throw new HttpException("No organization context selected", 403);
  }
  if (session.hrm_time_tracking_organization_id !== props.organizationId) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const pendingTimesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        hrm_time_tracking_organization_id: props.organizationId,
        deleted_at: null,
        status: "submitted",
      },
      select: {
        id: true,
      },
    });
  if (pendingTimesheet !== null) {
    throw new HttpException("Pending timesheets exist", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_owner_sessions.deleteMany({
      where: {
        hrm_time_tracking_owner_id: props.owner.id,
        hrm_time_tracking_organization_id: props.organizationId,
      },
    });
    await tx.hrm_time_tracking_organizations.delete({
      where: {
        id: props.organizationId,
      },
    });
  });
}
