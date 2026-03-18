import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingManagerDepartmentsDepartmentId(props: {
  manager: ManagerPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findFirstOrThrow({
      where: {
        id: props.manager.session_id,
        hrm_time_tracking_manager_id: props.manager.id,
        expired_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        hrm_time_tracking_manager_id: true,
      },
    });
  await MyGlobal.prisma.hrm_time_tracking_managers.findFirstOrThrow({
    where: {
      id: session.hrm_time_tracking_manager_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const department =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  const permitted = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      hrm_time_tracking_organization_id:
        department.hrm_time_tracking_organization_id,
      deleted_at: null,
      permissions: {
        some: {
          permission: "org:manage",
          deleted_at: null,
        },
      },
    },
    select: {
      id: true,
    },
  });
  if (permitted === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_departments.delete({
    where: {
      id: department.id,
    },
  });
}
