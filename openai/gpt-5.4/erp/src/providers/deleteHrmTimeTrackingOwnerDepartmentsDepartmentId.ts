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

export async function deleteHrmTimeTrackingOwnerDepartmentsDepartmentId(props: {
  owner: OwnerPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirstOrThrow({
      where: {
        id: props.owner.session_id,
        hrm_time_tracking_owner_id: props.owner.id,
      },
      select: {
        hrm_time_tracking_organization_id: true,
      },
    });
  await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
    where: {
      id: props.departmentId,
      hrm_time_tracking_organization_id:
        session.hrm_time_tracking_organization_id,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_departments.delete({
    where: {
      id: props.departmentId,
    },
  });
}
